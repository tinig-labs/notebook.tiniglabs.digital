import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const normEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export const isAdminEmail = (email: string) => adminEmails().includes(normEmail(email));

/** Closed beta: only approved emails (and admins) can sign in. */
export async function isAllowed(email: string) {
  const e = normEmail(email);
  if (!e) return false;
  if (isAdminEmail(e)) return true;
  const [row] = await db().select({ email: schema.allowlist.email }).from(schema.allowlist).where(eq(schema.allowlist.email, e)).limit(1);
  return !!row;
}
