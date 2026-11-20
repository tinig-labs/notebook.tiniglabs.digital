import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { CLAIM_STALE, startTranscription } from "@/lib/transcribe";

/** Every 5 min (worker.mjs): resend queued transcriptions that never got an answer. */
export async function POST(r: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || r.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
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
  return Response.json({ tried: queued.length, ok });
}
