import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { deviceUser } from "@/lib/devices";
import { later, rateLimit } from "@/lib/cf";
import { CLAIM_STALE, startTranscription } from "@/lib/transcribe";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Queues IPA for one recording and hands it to Modal right away; the cron retries anything unanswered.
 * Each call can cost a GPU job, so it is rate limited, and a job already with Modal is never re-sent.
 */
export async function POST(r: Request, c: Ctx) {
  const g = await deviceUser(r);
  if (g.error) return g.error;
  const { user } = g;
  const { id } = await c.params;
  if (!(await rateLimit("TRANSCRIBE_LIMITER", user.id))) return Response.json({ error: "Slow down." }, { status: 429 });

  const t = schema.records;
  const mine = and(eq(t.id, id), eq(t.userId, user.id), eq(t.kind, "recording"), eq(t.deleted, false), eq(t.audioUploaded, true));
  const inFlight = sql`(${t.ipaStatus} = 'queued' and ${t.ipaClaimedAt} is not null and ${t.ipaClaimedAt} >= now() - ${CLAIM_STALE})`;

  const [row] = await db()
    .update(t)
    .set({ ipaStatus: "queued", ipaAttempts: 0, ipaError: null, ipaClaimedAt: null, rev: sql`nextval(pg_get_serial_sequence('records', 'rev'))` })
    .where(and(mine, sql`not ${inFlight}`))
    .returning({ id: t.id });
  if (!row) {
    // Already being transcribed: report it as queued without starting another job.
    const [busy] = await db().select({ id: t.id }).from(t).where(and(mine, inFlight)).limit(1);
    if (busy) return Response.json({ ok: true, status: "queued" }, { status: 202 });
    return Response.json({ error: "Upload the audio first." }, { status: 409 });
  }
  later(startTranscription(id, user.id));
  return Response.json({ ok: true, status: "queued" }, { status: 202 });
}
