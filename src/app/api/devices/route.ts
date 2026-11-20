import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/session";
import { DEVICE_HEADER } from "@/lib/devices";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/cf";

export async function GET(r: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const rows = await db()
    .select()
    .from(schema.devices)
    .where(and(eq(schema.devices.userId, user.id), isNull(schema.devices.revokedAt)))
    .orderBy(desc(schema.devices.lastSeenAt));
  const self = r.headers.get(DEVICE_HEADER);
  return Response.json({
    devices: rows.map((d) => ({ id: d.id, name: d.name, lastSeenAt: d.lastSeenAt.getTime(), current: d.id === self })),
  });
}

/** Signs a lost or old device out. Its local copy is wiped the next time it goes online. */
export async function POST(r: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { revoke } = (await r.json().catch(() => ({}))) as { revoke?: string };
  if (typeof revoke !== "string") return Response.json({ error: "revoke required" }, { status: 400 });
  const done = await db()
    .update(schema.devices)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.devices.id, revoke), eq(schema.devices.userId, user.id)))
    .returning({ id: schema.devices.id });
  if (done.length) await audit(user.id, "device_revoke", { detail: revoke, ip: clientIp(r) });
  return Response.json({ ok: !!done.length });
}
