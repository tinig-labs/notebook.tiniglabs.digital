import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { fromB64, toB64 } from "./aead";

/**
 * Envelope encryption. Each user has a random AES-256 data key (DEK). It is stored only wrapped
 * with AES-KW under the master key NOTEBOOK_KEK (a Worker secret), so a database leak alone
 * reveals nothing. To rotate: add NOTEBOOK_KEK_V2, bump KEK_VERSION, and rewrap rows lazily.
 */
const KEK_VERSION = 1;

function kekSecret(version: number) {
  const v = version === 1 ? process.env.NOTEBOOK_KEK : process.env[`NOTEBOOK_KEK_V${version}`];
  if (!v) throw new Error(`NOTEBOOK_KEK${version === 1 ? "" : `_V${version}`} is not set`);
  const raw = fromB64(v);
  if (raw.length !== 32) throw new Error("NOTEBOOK_KEK must be 32 bytes, base64");
  return raw;
}

const kekCache = new Map<number, Promise<CryptoKey>>();
function kek(version: number) {
  let k = kekCache.get(version);
  if (!k) {
    k = crypto.subtle.importKey("raw", kekSecret(version), "AES-KW", false, ["wrapKey", "unwrapKey"]);
    kekCache.set(version, k);
  }
  return k;
}

async function unwrap(wrapped: string, version: number) {
  return crypto.subtle.unwrapKey("raw", fromB64(wrapped), await kek(version), "AES-KW", "AES-GCM", true, ["encrypt", "decrypt"]);
}

/** The user's DEK, created on first use. Extractable so it can be handed to the user's own devices. */
export async function userDek(userId: string): Promise<CryptoKey> {
  const [row] = await db().select().from(schema.userKeys).where(eq(schema.userKeys.userId, userId)).limit(1);
  if (row) return unwrap(row.wrappedDek, row.kekVersion);

  const dek = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const wrapped = toB64(new Uint8Array(await crypto.subtle.wrapKey("raw", dek, await kek(KEK_VERSION), "AES-KW")));
  const [created] = await db()
    .insert(schema.userKeys)
    .values({ userId, wrappedDek: wrapped, kekVersion: KEK_VERSION })
    .onConflictDoNothing()
    .returning();
  if (created) return dek;
  // Lost a race with another device: use the stored key.
  const [existing] = await db().select().from(schema.userKeys).where(eq(schema.userKeys.userId, userId)).limit(1);
  return unwrap(existing.wrappedDek, existing.kekVersion);
}

export async function exportDek(dek: CryptoKey) {
  return toB64(new Uint8Array(await crypto.subtle.exportKey("raw", dek)));
}
