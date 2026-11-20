import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { audioBucket } from "@/lib/cf";
import { userDek } from "@/lib/crypto/server";
import { aadAudio, aadRecord, open, sealJson } from "@/lib/crypto/aead";
import { submitJob, type IpaResult } from "@/lib/modal";
import { IPA_MAX_ATTEMPTS } from "@/lib/constants";
import { audit } from "@/lib/audit";

export type TranscriptPayload = IpaResult & { recordingId: string; createdAt: number };

const nextRev = sql`nextval(pg_get_serial_sequence('records', 'rev'))`;
export const transcriptId = (recordingId: string) => `t_${recordingId}`;
/** A job not answered within this long is retried by the cron (GPU timeout is 10 min). */
export const CLAIM_STALE = sql`interval '12 minutes'`;

const t = schema.records;

async function fail(id: string, attempts: number, msg: string) {
  console.error("transcription failed", id, msg);
  await db()
    .update(t)
    .set({ ipaStatus: attempts >= IPA_MAX_ATTEMPTS ? "failed" : "queued", ipaError: msg.slice(0, 300), ipaClaimedAt: null, rev: nextRev })
    .where(eq(t.id, id));
}

/**
 * Step 1: decrypt one recording in memory and hand it to Modal. Returns in a few seconds; the
 * result arrives at /api/ipa-callback. Plain audio is never written anywhere.
 */
export async function startTranscription(id: string, userId: string) {
  const [row] = await db()
    .update(t)
    .set({ ipaAttempts: sql`${t.ipaAttempts} + 1`, ipaClaimedAt: new Date() })
    .where(
      and(
        eq(t.id, id),
        eq(t.userId, userId),
        eq(t.ipaStatus, "queued"),
        eq(t.deleted, false),
        eq(t.audioUploaded, true),
        sql`(${t.ipaClaimedAt} is null or ${t.ipaClaimedAt} < now() - ${CLAIM_STALE})`,
      ),
    )
    .returning({ attempts: t.ipaAttempts });
  if (!row) return false;
  try {
    const obj = await audioBucket().get(id);
    if (!obj) throw new Error("audio missing");
    const wav = await open(await userDek(userId), new Uint8Array(await obj.arrayBuffer()), aadAudio(id));
    await submitJob(id, wav);
    return true;
  } catch (e) {
    await fail(id, row.attempts, e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Step 2: Modal's result. Encrypted as a `transcript` record, which reaches devices through sync. */
export async function finishTranscription(id: string, result: IpaResult | { error: string }) {
  const [row] = await db()
    .select({ userId: t.userId, attempts: t.ipaAttempts })
    .from(t)
    .where(and(eq(t.id, id), eq(t.kind, "recording"), eq(t.deleted, false), eq(t.ipaStatus, "queued")))
    .limit(1);
  if (!row) return false; // deleted, or already answered
  if ("error" in result) {
    await fail(id, row.attempts, `model: ${result.error}`);
    return true;
  }
  const dek = await userDek(row.userId);
  const tid = transcriptId(id);
  const payload: TranscriptPayload = { recordingId: id, model: result.model, ipa: result.ipa, segments: result.segments, createdAt: Date.now() };
  const data = await sealJson(dek, payload, aadRecord(tid));
  await db()
    .insert(t)
    .values({ id: tid, userId: row.userId, kind: "transcript", parentId: id, clientUpdatedAt: new Date(), data })
    .onConflictDoUpdate({
      target: t.id,
      set: { data, clientUpdatedAt: new Date(), deleted: false, rev: nextRev },
      setWhere: sql`${t.userId} = ${row.userId}`,
    });
  await db().update(t).set({ ipaStatus: "done", ipaError: null, ipaClaimedAt: null, rev: nextRev }).where(eq(t.id, id));
  await audit(row.userId, "transcribe", { recordId: id });
  return true;
}
