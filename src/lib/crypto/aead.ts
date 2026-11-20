/**
 * AES-256-GCM with a random 96-bit IV, packed as iv || ciphertext+tag. The record or audio id is
 * bound as additional authenticated data, so ciphertext can't be swapped between records.
 * Shared by the browser (local store, uploads) and the Worker (transcription).
 */
const enc = new TextEncoder();
const dec = new TextDecoder();
const IV_BYTES = 12;

export async function seal(key: CryptoKey, plain: Uint8Array, aad: string): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, key, plain as Uint8Array<ArrayBuffer>),
  );
  const out = new Uint8Array(IV_BYTES + ct.length);
  out.set(iv);
  out.set(ct, IV_BYTES);
  return out;
}

export async function open(key: CryptoKey, packed: Uint8Array, aad: string): Promise<Uint8Array<ArrayBuffer>> {
  const iv = packed.slice(0, IV_BYTES);
  const ct = packed.slice(IV_BYTES);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, key, ct));
}

export async function sealJson(key: CryptoKey, value: unknown, aad: string) {
  return toB64(await seal(key, enc.encode(JSON.stringify(value)), aad));
}

export async function openJson<T>(key: CryptoKey, b64: string, aad: string): Promise<T> {
  return JSON.parse(dec.decode(await open(key, fromB64(b64), aad))) as T;
}

export function toB64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** AAD labels. Audio and record payloads with the same id can't be confused for each other. */
export const aadRecord = (id: string) => `rec:${id}`;
export const aadAudio = (id: string) => `audio:${id}`;
