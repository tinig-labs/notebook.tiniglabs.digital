"use client";
import { useMemo, useSyncExternalStore } from "react";
import { aadAudio, aadRecord, open, openJson, seal, sealJson } from "@/lib/crypto/aead";
import { ldb } from "./db";
import type { Item, Kind, LocalRow, Payload } from "./types";

/**
 * The decrypted working set lives only in memory. IndexedDB holds ciphertext, so a copied
 * browser profile shows nothing without the (non-extractable) key. Writes encrypt, persist,
 * mark the row dirty for sync, then notify subscribers.
 */

let key: CryptoKey | null = null;
const items = new Map<string, Item>();
let version = 0;
const listeners = new Set<() => void>();
let onChange: (() => void) | null = null;

const notify = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Called by the sync engine so every local edit is pushed soon after. */
export const setChangeHandler = (fn: () => void) => (onChange = fn);

function requireKey() {
  if (!key) throw new Error("Notebook is locked");
  return key;
}

async function decryptRow(row: LocalRow): Promise<Item | null> {
  if (row.deleted || !row.data) return null;
  try {
    const value = await openJson<Payload[Kind]>(requireKey(), row.data, aadRecord(row.id));
    return {
      id: row.id,
      kind: row.kind,
      parentId: row.parentId,
      updatedAt: row.updatedAt,
      value,
      dirty: !!row.dirty,
      audioUploaded: row.audioUploaded,
      ipaStatus: row.ipaStatus,
    };
  } catch (e) {
    console.error("could not decrypt", row.id, e);
    return null;
  }
}

export async function initStore(k: CryptoKey) {
  key = k;
  items.clear();
  const rows = await ldb().records.toArray();
  const decrypted = await Promise.all(rows.map(decryptRow));
  for (const it of decrypted) if (it) items.set(it.id, it);
  notify();
}

export function lockStore() {
  key = null;
  items.clear();
  notify();
}

export const newId = () => crypto.randomUUID();

export async function put<K extends Exclude<Kind, "transcript">>(kind: K, id: string, value: Payload[K], parentId: string | null = null) {
  const data = await sealJson(requireKey(), value, aadRecord(id));
  const prev = await ldb().records.get(id);
  const row: LocalRow = {
    id,
    kind,
    parentId,
    updatedAt: Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1),
    deleted: false,
    data,
    rev: prev?.rev ?? 0,
    dirty: 1,
    audioUploaded: prev?.audioUploaded,
    ipaStatus: prev?.ipaStatus,
  };
  await ldb().records.put(row);
  items.set(id, { id, kind, parentId, updatedAt: row.updatedAt, value, dirty: true, audioUploaded: row.audioUploaded, ipaStatus: row.ipaStatus });
  notify();
  onChange?.();
  return id;
}

/** Tombstones a record (and a patient's recordings). Local audio is removed at once. */
export async function remove(id: string) {
  const ids = [id];
  const it = items.get(id);
  if (it?.kind === "patient") for (const r of items.values()) if (r.kind === "recording" && r.parentId === id) ids.push(r.id);
  await ldb().transaction("rw", ldb().records, ldb().audio, ldb().jobs, async () => {
    for (const rid of ids) {
      const prev = await ldb().records.get(rid);
      if (!prev) continue;
      await ldb().records.put({ ...prev, deleted: true, data: "", dirty: 1, updatedAt: Math.max(Date.now(), prev.updatedAt + 1) });
      await ldb().audio.delete(rid);
      await ldb().jobs.delete(rid);
    }
  });
  for (const rid of ids) {
    items.delete(rid);
    items.delete(`t_${rid}`);
  }
  notify();
  onChange?.();
}

/** Server rows from a pull. A local edit that is newer than the server's copy is kept. */
export async function applyRemote(rows: (Omit<LocalRow, "dirty">)[]) {
  for (const r of rows) {
    const local = await ldb().records.get(r.id);
    if (local?.dirty && local.updatedAt > r.updatedAt && !r.deleted) {
      await ldb().records.update(r.id, { rev: r.rev, audioUploaded: r.audioUploaded, ipaStatus: r.ipaStatus });
      const it = items.get(r.id);
      if (it) items.set(r.id, { ...it, audioUploaded: r.audioUploaded, ipaStatus: r.ipaStatus });
      continue;
    }
    const row: LocalRow = { ...r, dirty: 0 };
    await ldb().records.put(row);
    if (r.deleted) {
      items.delete(r.id);
      await ldb().audio.delete(r.id);
      continue;
    }
    const it = await decryptRow(row);
    if (it) items.set(it.id, it);
  }
  if (rows.length) notify();
}

export async function markRows(ids: string[], patch: Partial<LocalRow>) {
  await ldb().records.where("id").anyOf(ids).modify(patch);
  let changed = false;
  for (const id of ids) {
    const it = items.get(id);
    if (!it) continue;
    items.set(id, {
      ...it,
      dirty: patch.dirty === undefined ? it.dirty : !!patch.dirty,
      audioUploaded: patch.audioUploaded ?? it.audioUploaded,
      ipaStatus: patch.ipaStatus ?? it.ipaStatus,
    });
    changed = true;
  }
  if (changed) notify();
}

// ---- Audio -------------------------------------------------------------------------------------

export async function saveAudio(id: string, wav: Blob) {
  const packed = await seal(requireKey(), new Uint8Array(await wav.arrayBuffer()), aadAudio(id));
  await ldb().audio.put({ id, data: new Blob([packed]), uploaded: 0 });
}

const audioUrls = new Map<string, string>();

/** Plain WAV for playback/export: from this device, or downloaded (still encrypted) and cached. */
export async function audioBlob(id: string, fetcher: (id: string) => Promise<Blob | null>): Promise<Blob | null> {
  let row = await ldb().audio.get(id);
  if (!row) {
    const enc = await fetcher(id);
    if (!enc) return null;
    row = { id, data: enc, uploaded: 1 };
    await ldb().audio.put(row);
  }
  const plain = await open(requireKey(), new Uint8Array(await row.data.arrayBuffer()), aadAudio(id));
  return new Blob([plain], { type: "audio/wav" });
}

export async function audioUrl(id: string, fetcher: (id: string) => Promise<Blob | null>) {
  const cached = audioUrls.get(id);
  if (cached) return cached;
  const b = await audioBlob(id, fetcher);
  if (!b) return null;
  const url = URL.createObjectURL(b);
  audioUrls.set(id, url);
  return url;
}

export const hasLocalAudio = async (id: string) => !!(await ldb().audio.get(id));

// ---- Reading -----------------------------------------------------------------------------------

export function useStoreVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function useItems<K extends Kind>(kind: K, filter?: (i: Item<K>) => boolean, deps: unknown[] = []): Item<K>[] {
  const v = useStoreVersion();
  const key = deps.map(String).join("|");
  return useMemo(() => {
    const out: Item<K>[] = [];
    for (const it of items.values()) if (it.kind === kind && (!filter || filter(it as Item<K>))) out.push(it as Item<K>);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, kind, key]);
}

export function useItem<K extends Kind>(kind: K, id: string | null | undefined): Item<K> | null {
  const v = useStoreVersion();
  return useMemo(() => {
    const it = id ? items.get(id) : undefined;
    return it && it.kind === kind ? (it as Item<K>) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, kind, id]);
}

export const allItems = () => [...items.values()];
export const getItem = (id: string) => items.get(id) ?? null;
