"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/session";
import { normEmail } from "@/lib/allowlist";
import { audit } from "@/lib/audit";
import { emailConfigured, sendEmail } from "@/lib/email";
import { accessApprovedEmail } from "@/lib/emails";

export async function approve(form: FormData) {
  const admin = await requireAdmin();
  const email = normEmail(form.get("email"));
  if (!email) return;
  await db().insert(schema.allowlist).values({ email, approvedBy: admin.email }).onConflictDoNothing();
  await db().update(schema.accessRequests).set({ status: "approved", decidedAt: new Date() }).where(eq(schema.accessRequests.email, email));
  await audit(admin.id, "access_approve", { detail: email });
  if (emailConfigured()) await sendEmail({ to: email, ...accessApprovedEmail() }).catch((e) => console.error("approval email failed", e));
  revalidatePath("/admin");
}

export async function deny(form: FormData) {
  const admin = await requireAdmin();
  const email = normEmail(form.get("email"));
  if (!email) return;
  await db().update(schema.accessRequests).set({ status: "denied", decidedAt: new Date() }).where(eq(schema.accessRequests.email, email));
  await audit(admin.id, "access_deny", { detail: email });
  revalidatePath("/admin");
}

/** Removes beta access. Their sessions stop working on the next request (getCurrentUser checks). */
export async function revoke(form: FormData) {
  const admin = await requireAdmin();
  const email = normEmail(form.get("email"));
  if (!email) return;
  await db().delete(schema.allowlist).where(eq(schema.allowlist.email, email));
  await audit(admin.id, "access_revoke", { detail: email });
  revalidatePath("/admin");
}
