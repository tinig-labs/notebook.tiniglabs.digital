import "server-only";
import { db, schema } from "@/db";
import type { AuditAction } from "@/db/schema";

/** Never pass patient content here: ids and actions only. */
export async function audit(userId: string, action: AuditAction, opts: { recordId?: string; detail?: string; ip?: string | null } = {}) {
  try {
    await db().insert(schema.auditLog).values({ userId, action, recordId: opts.recordId, detail: opts.detail, ip: opts.ip ?? null });
  } catch (e) {
    console.error("audit insert failed", action, e);
  }
}
