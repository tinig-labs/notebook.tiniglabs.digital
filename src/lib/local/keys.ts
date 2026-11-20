"use client";
import { fromB64 } from "@/lib/crypto/aead";
import { getMeta, setMeta } from "./db";

export type Me = { id: string; email: string; name: string; admin: boolean };

/** Random id for this install; sent with every sync so a lost device can be signed out. */
export async function deviceId() {
  let id = await getMeta<string>("deviceId");
  if (!id) {
    const b = crypto.getRandomValues(new Uint8Array(18));
    id = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await setMeta("deviceId", id);
  }
  return id;
}

/**
 * Imports the data key as non-extractable and keeps the CryptoKey object in IndexedDB.
 * Scripts on this origin can encrypt/decrypt with it, but the raw bytes can't be read back.
 */
export async function storeKey(rawB64: string, me: Me) {
  const raw = fromB64(rawB64);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  raw.fill(0);
  const prev = await getMeta<Me>("me");
  await setMeta("key", key);
  await setMeta("me", me);
  return { key, switched: !!prev && prev.id !== me.id };
}

export const loadKey = () => getMeta<CryptoKey>("key");
export const loadMe = () => getMeta<Me>("me");
