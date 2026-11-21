ALTER TABLE "devices" ADD COLUMN "session_id" text;--> statement-breakpoint
CREATE INDEX "devices_user_session_idx" ON "devices" USING btree ("user_id","session_id");