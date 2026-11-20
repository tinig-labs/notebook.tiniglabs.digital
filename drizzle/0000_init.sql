CREATE TYPE "public"."ipa_status" AS ENUM('none', 'queued', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."record_kind" AS ENUM('patient', 'recording', 'label', 'transcript');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TABLE "access_requests" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clinic" text,
	"prc_license" text,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "allowlist" (
	"email" text PRIMARY KEY NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"record_id" text,
	"detail" text,
	"ip" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "record_kind" NOT NULL,
	"parent_id" text,
	"rev" bigserial NOT NULL,
	"client_updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"data" text DEFAULT '' NOT NULL,
	"audio_bytes" integer,
	"audio_uploaded" boolean DEFAULT false NOT NULL,
	"ipa_status" "ipa_status" DEFAULT 'none' NOT NULL,
	"ipa_attempts" integer DEFAULT 0 NOT NULL,
	"ipa_error" text,
	"ipa_claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_keys" (
	"user_id" text PRIMARY KEY NOT NULL,
	"wrapped_dek" text NOT NULL,
	"kek_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_requests_status_idx" ON "access_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "audit_user_at_idx" ON "audit_log" USING btree ("user_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_id_idx" ON "devices" USING btree ("user_id","id");--> statement-breakpoint
CREATE INDEX "records_user_rev_idx" ON "records" USING btree ("user_id","rev");--> statement-breakpoint
CREATE INDEX "records_ipa_queue_idx" ON "records" USING btree ("ipa_status") WHERE "records"."ipa_status" = 'queued';