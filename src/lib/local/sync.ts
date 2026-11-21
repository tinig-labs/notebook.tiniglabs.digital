"use client";
import { useSyncExternalStore } from "react";
import { getMeta, ldb, setMeta, wipeLocal } from "./db";
import { deviceId } from "./keys";
import { applyRemote, markRows, setChangeHandler } from "./store";
import type { LocalRow } from "./types";

/**
 * Offline-first sync. Order per run: push dirty records, upload pending audio, run queued
 * transcription requests, then pull everything newer than the last server rev.
 * Triggers: launch, edits (debounced), coming online, tab focus, and every 60 s.
 */

export type SyncState = "idle" | "syncing" | "offline" | "error" | "signed-out";
type Status = { state: SyncState; pending: number; lastSync: number | null };

let status: Status = { state: "idle", pending: 0, lastSync: null };
const listeners = new Set<() => void>();
const set = (s: Partial<Status>) => {
  status = { ...status, ...s };
  listeners.forEach((l) => l());
};

export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-device-id", await deviceId());
  const res = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  const taken = res.status === 409 && ((await res.clone().json().catch(() => null)) as { code?: string } | null)?.code === "DEVICE_TAKEN";
  if (res.status === 410 || taken) {
    // 410: signed out from another device. DEVICE_TAKEN: someone else signed in on this browser.
    // Either way this copy must not stay open here.
    await wipeLocal();
    location.replace(taken ? "/sign-in" : "/sign-in?revoked=1");
    throw new HttpError(res.status);
  }
  if (!res.ok) throw new HttpError(res.status);
  return res;
}

export async function fetchAudio(id: string): Promise<Blob | null> {
  try {
    return await (await api(`/api/audio/${id}`)).blob();
  } catch {
    return null;
  }
}

async function countPending() {
  const [rows, audio] = await Promise.all([ldb().records.where("dirty").equals(1).count(), ldb().audio.where("uploaded").equals(0).count()]);
  return rows + audio;
}

type RemoteRow = Omit<LocalRow, "dirty">;

async function push() {
  for (;;) {
    const dirty = await ldb().records.where("dirty").equals(1).limit(200).toArray();
    if (!dirty.length) return;
    const res = await api("/api/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        changes: dirty.map((r) => ({ id: r.id, kind: r.kind, parentId: r.parentId, updatedAt: r.updatedAt, deleted: r.deleted, data: r.data })),
      }),
    });
    const { applied } = (await res.json()) as { applied: string[] };
    const ok = new Set(applied);
    // Clear dirty only if the row wasn't edited again while the request was in flight.
    const sent = new Map(dirty.map((r) => [r.id, r.updatedAt]));
    const fresh = await ldb().records.where("id").anyOf([...sent.keys()]).toArray();
    const done = fresh.filter((r) => r.updatedAt === sent.get(r.id)).map((r) => r.id);
    await markRows(done, { dirty: 0 });
    // The server kept a newer copy: re-pull from just before it so the server's version lands here.
    const lost = fresh.filter((r) => !ok.has(r.id) && done.includes(r.id));
    if (lost.length) {
      const minRev = Math.min(...lost.map((r) => r.rev || 1));
      const last = (await getMeta<number>("lastRev")) ?? 0;
      await setMeta("lastRev", Math.min(last, Math.max(0, minRev - 1)));
    }
    if (dirty.length < 200) return;
  }
}

async function uploadAudio() {
  const pending = await ldb().audio.where("uploaded").equals(0).toArray();
  for (const a of pending) {
    const rec = await ldb().records.get(a.id);
    if (!rec || rec.deleted) {
      await ldb().audio.delete(a.id);
      continue;
    }
    if (rec.dirty && !rec.rev) continue; // the row must reach the server first
    await api(`/api/audio/${a.id}`, { method: "PUT", body: a.data, headers: { "content-type": "application/octet-stream" } });
    await ldb().audio.update(a.id, { uploaded: 1 });
    await markRows([a.id], { audioUploaded: true });
  }
}

async function runJobs() {
  const jobs = await ldb().jobs.toArray();
  for (const j of jobs) {
    const rec = await ldb().records.get(j.id);
    if (!rec || rec.deleted) {
      await ldb().jobs.delete(j.id);
      continue;
    }
    const audio = await ldb().audio.get(j.id);
    if (audio && !audio.uploaded) continue;
    try {
      await api(`/api/recordings/${j.id}/transcribe`, { method: "POST" });
      await ldb().jobs.delete(j.id);
      await markRows([j.id], { ipaStatus: "queued" });
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) continue; // audio not on the server yet
      if (e instanceof HttpError && e.status === 429) return; // rate limited: the rest wait for the next sync
      throw e;
    }
  }
}

async function pull() {
  for (;;) {
    const since = (await getMeta<number>("lastRev")) ?? 0;
    const res = await api(`/api/sync?since=${since}`);
    const { rows, more, rev } = (await res.json()) as { rows: RemoteRow[]; more: boolean; rev: number };
    await applyRemote(rows);
    await setMeta("lastRev", rev);
    if (!more) return;
  }
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      if (!navigator.onLine) {
        set({ state: "offline", pending: await countPending() });
        break;
      }
      set({ state: "syncing" });
      try {
        const hadWork = (await countPending()) > 0 || (await ldb().jobs.count()) > 0;
        await push();
        // Push first so rows exist on the server; pull brings revs that unblock audio uploads.
        await pull();
        if (hadWork) {
          await uploadAudio();
          await runJobs();
          await pull();
        }
        set({ state: "idle", lastSync: Date.now(), pending: await countPending() });
      } catch (e) {
        const st = e instanceof HttpError && e.status === 401 ? "signed-out" : navigator.onLine ? "error" : "offline";
        set({ state: st, pending: await countPending() });
        if (st === "error") console.error("sync failed", e);
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Ask for IPA. Works offline: the request waits in the queue until audio is uploaded. */
export async function requestTranscription(id: string) {
  await ldb().jobs.put({ id, kind: "transcribe", at: Date.now() });
  await markRows([id], { ipaStatus: "queued" });
  void syncNow();
}

let started = false;
export function startSync() {
  if (started) return;
  started = true;
  let t: ReturnType<typeof setTimeout> | undefined;
  setChangeHandler(() => {
    clearTimeout(t);
    t = setTimeout(() => void syncNow(), 800);
    void countPending().then((pending) => set({ pending }));
  });
  // Background triggers (focus, timer) skip if a sync just ran; edits and reconnects always sync.
  const soft = () => {
    if (document.visibilityState !== "visible" || running) return;
    if (status.lastSync && Date.now() - status.lastSync < 15_000) return;
    void syncNow();
  };
  addEventListener("online", () => void syncNow());
  addEventListener("offline", () => set({ state: "offline" }));
  document.addEventListener("visibilitychange", soft);
  setInterval(soft, 60_000);
  void syncNow();
}

export { api };
