import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { queueBucket } from "@/lib/cf";
import { markQueued, takeMarker } from "@/lib/ipa-queue";
import { CLAIM_STALE, startTranscription } from "@/lib/transcribe";

/**
 * Every 5 min (worker.mjs): resend queued transcriptions that never got an answer.
 * Neon is only queried when the queue marker is set, or on the 6-hourly sweep worker.mjs flags,
 * so compute can scale to zero while nothing is queued.
 */
export async function POST(r: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || r.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const bucket = queueBucket();
  const marked = await takeMarker(bucket);
  if (!marked && r.headers.get("x-cron-sweep") !== "1") return Response.json({ skipped: true });

  const t = schema.records;
  const queued = await db()
    .select({ id: t.id, userId: t.userId })
    .from(t)
    // Skip jobs Modal may still be answering.
    .where(
      and(
        eq(t.ipaStatus, "queued"),
        eq(t.deleted, false),
        sql`(${t.ipaClaimedAt} is null or ${t.ipaClaimedAt} < now() - ${CLAIM_STALE})`,
      ),
    )
    .orderBy(asc(t.ipaAttempts), asc(t.rev))
    .limit(10);
  let ok = 0;
  for (const q of queued) if (await startTranscription(q.id, q.userId)) ok++;
  // Includes jobs still with Modal: they may need a retry once CLAIM_STALE passes.
  const [{ left }] = await db()
    .select({ left: count() })
    .from(t)
    .where(and(eq(t.ipaStatus, "queued"), eq(t.deleted, false)));
  if (left > 0) await markQueued(bucket);
  return Response.json({ tried: queued.length, ok, left });
}
