import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { deviceUser as guard } from "@/lib/devices";
import { audioBucket, later } from "@/lib/cf";
import { SYNC_BATCH } from "@/lib/constants";

/**
 * Pull: rows changed since `rev`, oldest first. Push: last-write-wins upserts keyed on the
 * client's updatedAt. Payloads are ciphertext; the server only sees ids, kinds and timestamps.
 */

const ID = /^[A-Za-z0-9_-]{8,64}$/;
const CLIENT_KINDS = new Set(["patient", "recording", "label", "target"]);
const MAX_DATA = 64 * 1024;

const out = (r: schema.RecordRow) => ({
  id: r.id,
  kind: r.kind,
  parentId: r.parentId,
  rev: r.rev,
  updatedAt: r.clientUpdatedAt.getTime(),
  deleted: r.deleted,
  data: r.data,
  audioUploaded: r.audioUploaded,
  ipaStatus: r.ipaStatus,
});

export async function GET(r: Request) {
  const g = await guard(r);
  if (g.error) return g.error;
  const since = Math.max(0, Number(new URL(r.url).searchParams.get("since")) || 0);
  const rows = await db()
    .select()
    .from(schema.records)
    .where(and(eq(schema.records.userId, g.user.id), gt(schema.records.rev, since)))
    .orderBy(asc(schema.records.rev))
    .limit(SYNC_BATCH + 1);
  const more = rows.length > SYNC_BATCH;
  const page = rows.slice(0, SYNC_BATCH);
  return Response.json({ rows: page.map(out), more, rev: page.at(-1)?.rev ?? since });
}

type Change = { id: string; kind: string; parentId?: string | null; updatedAt: number; deleted?: boolean; data?: string; audioBytes?: number };

export async function POST(r: Request) {
  const g = await guard(r);
  if (g.error) return g.error;
  const body = (await r.json().catch(() => null)) as { changes?: Change[] } | null;
  const changes = Array.isArray(body?.changes) ? body.changes.slice(0, SYNC_BATCH) : null;
  if (!changes) return Response.json({ error: "changes[] required" }, { status: 400 });

  const now = Date.now();
  const values = [];
  for (const c of changes) {
    if (!ID.test(c.id) || !CLIENT_KINDS.has(c.kind)) return Response.json({ error: `bad change ${String(c.id)}` }, { status: 400 });
    if (c.parentId != null && !ID.test(c.parentId)) return Response.json({ error: "bad parentId" }, { status: 400 });
    if (typeof c.data !== "string" || c.data.length > MAX_DATA) return Response.json({ error: "bad data" }, { status: 400 });
    const at = Number(c.updatedAt);
    if (!Number.isFinite(at) || at > now + 5 * 60_000) return Response.json({ error: "bad updatedAt" }, { status: 400 });
    values.push({
      id: c.id,
      userId: g.user.id,
      kind: c.kind as "patient" | "recording" | "label" | "target",
      parentId: c.parentId ?? null,
      clientUpdatedAt: new Date(at),
      deleted: !!c.deleted,
      data: c.deleted ? "" : c.data, // tombstones keep no content
    });
  }
  if (!values.length) return Response.json({ applied: [] });

  const t = schema.records;
  const applied = await db()
    .insert(t)
    .values(values)
    .onConflictDoUpdate({
      target: t.id,
      set: {
        parentId: sql`excluded.parent_id`,
        clientUpdatedAt: sql`excluded.client_updated_at`,
        deleted: sql`excluded.deleted`,
        data: sql`excluded.data`,
        rev: sql`nextval(pg_get_serial_sequence('records', 'rev'))`,
      },
      // Only the owner, and only a newer edit, wins. Deletions are final.
      setWhere: sql`${t.userId} = excluded.user_id and ${t.clientUpdatedAt} < excluded.client_updated_at and ${t.deleted} = false`,
    })
    .returning({ id: t.id, kind: t.kind, deleted: t.deleted });

  const gone = applied.filter((a) => a.deleted && a.kind === "recording").map((a) => a.id);
  if (gone.length) {
    later(
      (async () => {
        await audioBucket().delete(gone);
        // Their transcripts go too.
        await db()
          .update(t)
          .set({ deleted: true, data: "", rev: sql`nextval(pg_get_serial_sequence('records', 'rev'))` })
          .where(and(eq(t.userId, g.user.id), eq(t.kind, "transcript"), sql`${t.parentId} in ${gone}`));
      })(),
    );
  }
  return Response.json({ applied: applied.map((a) => a.id) });
}
