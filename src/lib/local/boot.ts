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
 * Opens the notebook on this device. Online: the server must vouch for the session before the
 * local copy opens, so a shared phone never shows one person's patients to the next.
 * Offline (or server trouble): use the key already stored here, so the app keeps working in a
 * clinic with no signal.
 */
async function boot(retried = false): Promise<BootState> {
  let key = await loadKey();
  let me = await loadMe();

  if (navigator.onLine) {
    let res: Response | null = null;
    try {
      res = await fetch("/api/keys", { headers: { "x-device-id": await deviceId() }, cache: "no-store" });
    } catch {
      // Network blip: fall through to the local key.
    }
    if (res?.status === 401) {
      // Session expired: sign in again first. Local data stays, so the same person keeps any
      // unsynced work; if someone else signs in, the checks below wipe it.
      return { phase: "needs-sign-in" };
    }
    if (res?.status === 403 || res?.status === 410) {
      // Access removed or device revoked: drop local data.
      await wipeLocal();
      return { phase: "needs-sign-in" };
    }
    if (res?.status === 409) {
      // /api/keys only answers 409 for DEVICE_TAKEN.
      // This install belongs to another account: a different person signed in on this browser.
      await wipeLocal();
      return retried ? { phase: "error", message: "This device is set up for another account." } : boot(true);
    }
    if (res?.ok) {
      const j = (await res.json()) as { key: string; user: Me };
      const stored = await storeKey(j.key, j.user);
      if (stored.switched) {
        await wipeLocal();
        return retried ? { phase: "error", message: "Couldn't switch accounts on this device." } : boot(true);
      }
      key = stored.key;
      me = j.user;
    } else if (res && res.status < 500 && res.status !== 429) {
      // Any other refusal: don't open the local copy on the server's say-so being unclear.
      return { phase: "error", message: `Couldn't open the notebook (HTTP ${res.status}).` };
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
    (once ??= boot(false).catch((e) => ({ phase: "error", message: e instanceof Error ? e.message : String(e) }) as BootState)).then(
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
