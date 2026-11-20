"use client";
import { useEffect, useState } from "react";
import { wipeLocal } from "./db";
import { deviceId, loadKey, loadMe, storeKey, type Me } from "./keys";
import { initStore } from "./store";
import { startSync } from "./sync";

export type BootState =
  | { phase: "loading" }
  | { phase: "ready"; me: Me; offline: boolean }
  | { phase: "needs-sign-in" }
  | { phase: "needs-network" }
  | { phase: "error"; message: string };

/**
 * Opens the notebook on this device. Online: refresh the key and identity from the server.
 * Offline: use the key already stored here, so the app keeps working in a clinic with no signal.
 */
async function boot(): Promise<BootState> {
  let key = await loadKey();
  let me = await loadMe();

  if (navigator.onLine) {
    try {
      const res = await fetch("/api/keys", { headers: { "x-device-id": await deviceId() }, cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 410) {
        // Signed out, access removed, or device revoked: drop local data (it may be someone else's next).
        if (res.status !== 401 || !key) {
          await wipeLocal();
          return { phase: "needs-sign-in" };
        }
        // Session expired but this device is set up: keep working, sync waits for sign-in.
      } else if (res.ok) {
        const j = (await res.json()) as { key: string; user: Me };
        const stored = await storeKey(j.key, j.user);
        if (stored.switched) {
          await wipeLocal();
          return boot();
        }
        key = stored.key;
        me = j.user;
      }
    } catch {
      // Network blip: fall through to the local key.
    }
  }

  if (!key || !me) return navigator.onLine ? { phase: "needs-sign-in" } : { phase: "needs-network" };
  await initStore(key);
  // Ask the browser not to evict recordings under storage pressure.
  void navigator.storage?.persist?.().catch(() => {});
  startSync();
  return { phase: "ready", me, offline: !navigator.onLine };
}

let once: Promise<BootState> | null = null;

export function useBoot() {
  const [state, setState] = useState<BootState>({ phase: "loading" });
  useEffect(() => {
    let live = true;
    (once ??= boot().catch((e) => ({ phase: "error", message: e instanceof Error ? e.message : String(e) }) as BootState)).then(
      (s) => live && setState(s),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

export async function signOutEverywhereLocal() {
  once = null;
  await wipeLocal();
}
