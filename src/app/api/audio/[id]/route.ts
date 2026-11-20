import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/session";
import { audioBucket, rateLimit } from "@/lib/cf";
import { MAX_AUDIO_BYTES } from "@/lib/constants";

/**
 * Encrypted audio, keyed by recording id. The browser encrypts before upload and decrypts after
 * download, so this route (and R2) only ever handle ciphertext. The bucket has no public URL.
 */
type Ctx = { params: Promise<{ id: string }> };

async function own(userId: string, id: string) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  const [row] = await db()
    .select({ id: schema.records.id, deleted: schema.records.deleted, uploaded: schema.records.audioUploaded })
    .from(schema.records)
    .where(and(eq(schema.records.id, id), eq(schema.records.userId, userId), eq(schema.records.kind, "recording")))
    .limit(1);
  return row && !row.deleted ? row : null;
}

export async function PUT(r: Request, c: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await c.params;
  if (!(await rateLimit("UPLOAD_LIMITER", user.id))) return Response.json({ error: "Slow down." }, { status: 429 });
  // The recording row is synced first, so it must already exist and belong to this user.
  if (!(await own(user.id, id))) return Response.json({ error: "Not found" }, { status: 404 });

  const len = Number(r.headers.get("content-length"));
  if (!len || len > MAX_AUDIO_BYTES + 64) return Response.json({ error: "Audio too large." }, { status: 413 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength !== len) return Response.json({ error: "Incomplete upload." }, { status: 400 });

  await audioBucket().put(id, buf, {
    httpMetadata: { contentType: "application/octet-stream" },
    customMetadata: { userId: user.id, enc: "aes-256-gcm" },
  });
  await db()
    .update(schema.records)
    .set({ audioUploaded: true, audioBytes: buf.byteLength, rev: sql`nextval(pg_get_serial_sequence('records', 'rev'))` })
    .where(and(eq(schema.records.id, id), eq(schema.records.userId, user.id)));
  return Response.json({ ok: true });
}

export async function GET(_r: Request, c: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await c.params;
  if (!(await own(user.id, id))) return Response.json({ error: "Not found" }, { status: 404 });
  const obj = await audioBucket().get(id);
  if (!obj) return Response.json({ error: "Not uploaded yet" }, { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": "application/octet-stream", "content-length": String(obj.size), "cache-control": "private, no-store" },
  });
}
