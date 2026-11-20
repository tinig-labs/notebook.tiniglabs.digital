import { sql } from "drizzle-orm";
import { bigserial, boolean, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * The server is an encrypted store. Patient names, notes, labels and transcriptions live in
 * `records.data` as AES-256-GCM ciphertext; only structural fields needed for sync are plaintext.
 * Users themselves live in Neon Auth's `neon_auth` schema.
 */

export const recordKind = pgEnum("record_kind", ["patient", "recording", "label", "transcript", "target"]);
export const ipaStatus = pgEnum("ipa_status", ["none", "queued", "done", "failed"]);
export const requestStatus = pgEnum("request_status", ["pending", "approved", "denied"]);

/** Beta access: only these emails (and ADMIN_EMAILS) can receive a sign-in code. */
export const allowlist = pgTable("allowlist", {
  email: text("email").primaryKey(), // lowercase
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  approvedBy: text("approved_by").notNull(),
});

export const accessRequests = pgTable(
  "access_requests",
  {
    email: text("email").primaryKey(), // lowercase
    name: text("name").notNull(),
    clinic: text("clinic"),
    prcLicense: text("prc_license"),
    status: requestStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [index("access_requests_status_idx").on(t.status, t.createdAt)],
);

/** Per-user data key, wrapped (AES-KW) by the NOTEBOOK_KEK Worker secret. */
export const userKeys = pgTable("user_keys", {
  userId: text("user_id").primaryKey(),
  wrappedDek: text("wrapped_dek").notNull(), // base64
  kekVersion: integer("kek_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const records = pgTable(
  "records",
  {
    id: text("id").primaryKey(), // client-generated UUID (transcripts: "t_" + recording id)
    userId: text("user_id").notNull(),
    kind: recordKind("kind").notNull(),
    parentId: text("parent_id"),
    // Monotonic change counter for pull-based sync. Bumped with nextval() on every write.
    rev: bigserial("rev", { mode: "number" }).notNull(),
    clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true, mode: "date" }).notNull(),
    deleted: boolean("deleted").notNull().default(false),
    data: text("data").notNull().default(""), // base64(iv || AES-GCM ciphertext), AAD = id
    // Recordings only
    audioBytes: integer("audio_bytes"),
    audioUploaded: boolean("audio_uploaded").notNull().default(false),
    ipaStatus: ipaStatus("ipa_status").notNull().default("none"),
    ipaAttempts: integer("ipa_attempts").notNull().default(0),
    ipaError: text("ipa_error"),
    // Set while a Worker is transcribing, so the cron and a user's request don't run it twice.
    ipaClaimedAt: timestamp("ipa_claimed_at", { withTimezone: true }),
  },
  (t) => [
    index("records_user_rev_idx").on(t.userId, t.rev),
    index("records_ipa_queue_idx").on(t.ipaStatus).where(sql`${t.ipaStatus} = 'queued'`),
  ],
);

export const devices = pgTable(
  "devices",
  {
    id: text("id").primaryKey(), // random per install, stored in IndexedDB
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("devices_user_id_idx").on(t.userId, t.id)],
);

export const auditActions = [
  "sign_in_device",
  "export",
  "transcribe",
  "device_revoke",
  "account_delete",
  "access_approve",
  "access_deny",
  "access_revoke",
] as const;
export type AuditAction = (typeof auditActions)[number];

/** Who did what, never with patient content. Kept for the security record (NPC Circular 2016-01). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").$type<AuditAction>().notNull(),
    recordId: text("record_id"),
    detail: text("detail"),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_user_at_idx").on(t.userId, t.at)],
);

export type RecordRow = typeof records.$inferSelect;
