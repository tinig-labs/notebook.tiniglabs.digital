"use client";
import Dexie, { type EntityTable } from "dexie";
import type { LocalRow } from "./types";

/** Encrypted audio blob (iv||ct). `uploaded` mirrors the server once the PUT succeeds. */
export type AudioRow = { id: string; data: Blob; uploaded: 0 | 1 };
export type JobRow = { id: string; kind: "transcribe"; at: number };
export type MetaRow = { key: string; value: unknown };

export class NotebookDB extends Dexie {
  records!: EntityTable<LocalRow, "id">;
  audio!: EntityTable<AudioRow, "id">;
  jobs!: EntityTable<JobRow, "id">;
  meta!: EntityTable<MetaRow, "key">;
  constructor() {
    super("tinig-notebook");
    this.version(1).stores({
      records: "id, kind, parentId, dirty, rev",
      audio: "id, uploaded",
      jobs: "id",
      meta: "key",
    });
  }
}

let _db: NotebookDB | undefined;
export const ldb = () => (_db ??= new NotebookDB());

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await ldb().meta.get(key))?.value as T | undefined;
}
export const setMeta = (key: string, value: unknown) => ldb().meta.put({ key, value });

/** Signed out, revoked or deleted: nothing of the patient data may stay on this device. */
export async function wipeLocal() {
  _db?.close();
  _db = undefined;
  await Dexie.delete("tinig-notebook");
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("notebook-audio")).map((k) => caches.delete(k)));
  } catch {}
}
