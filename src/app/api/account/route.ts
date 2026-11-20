import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { apiUser } from "@/lib/session";
import { audioBucket } from "@/lib/cf";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/cf";
import { auth } from "@/lib/auth/server";

/**
 * Deletes everything: audio, records, the wrapped key, devices, and the sign-in account.
 * Without the key, any copy left in backups is unreadable. The audit entry keeps only the id.
 */
export async function DELETE(r: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { confirm } = (await r.json().catch(() => ({}))) as { confirm?: string };
  if (typeof confirm !== "string" || confirm.trim().toLowerCase() !== user.email.toLowerCase()) return Response.json({ error: "Type your email to confirm." }, { status: 400 });

  const t = schema.records;
  // R2 batch delete takes up to 1000 keys.
  for (;;) {
    const ids = await db()
      .select({ id: t.id })
      .from(t)
      .where(and(eq(t.userId, user.id), eq(t.kind, "recording"), eq(t.audioUploaded, true)))
      .limit(1000);
    if (!ids.length) break;
    await audioBucket().delete(ids.map((i) => i.id));
    await db()
      .update(t)
      .set({ audioUploaded: false })
      .where(sql`${t.id} in ${ids.map((i) => i.id)}`);
  }
  await db().delete(t).where(eq(t.userId, user.id));
  await db().delete(schema.userKeys).where(eq(schema.userKeys.userId, user.id));
  await db().delete(schema.devices).where(eq(schema.devices.userId, user.id));
  await audit(user.id, "account_delete", { ip: clientIp(r) });

  // Neon Auth keeps users in the neon_auth schema of this database; sessions cascade.
  try {
    await auth().signOut();
  } catch {}
  try {
    await db().execute(sql`delete from neon_auth."user" where id = ${user.id}`);
  } catch (e) {
    console.error("auth user delete failed (remove it in the Neon console)", e);
  }
  return Response.json({ ok: true });
}
