import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/session";
import { later } from "@/lib/cf";
import { startTranscription } from "@/lib/transcribe";

type Ctx = { params: Promise<{ id: string }> };

/** Queues IPA for one recording and hands it to Modal right away; the cron retries anything unanswered. */
export async function POST(_r: Request, c: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await c.params;
  const t = schema.records;
  const [row] = await db()
    .update(t)
    .set({ ipaStatus: "queued", ipaAttempts: 0, ipaError: null, ipaClaimedAt: null, rev: sql`nextval(pg_get_serial_sequence('records', 'rev'))` })
    .where(and(eq(t.id, id), eq(t.userId, user.id), eq(t.kind, "recording"), eq(t.deleted, false), eq(t.audioUploaded, true)))
    .returning({ id: t.id });
  if (!row) return Response.json({ error: "Upload the audio first." }, { status: 409 });
  later(startTranscription(id, user.id));
  return Response.json({ ok: true, status: "queued" }, { status: 202 });
}
