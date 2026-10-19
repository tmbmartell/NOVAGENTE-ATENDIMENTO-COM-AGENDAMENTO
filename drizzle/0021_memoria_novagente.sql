CREATE TABLE IF NOT EXISTS "meeting_recording" (
 "id" text PRIMARY KEY NOT NULL,
 "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
 "booking_id" text REFERENCES "booking"("id") ON DELETE SET NULL,
 "title" text NOT NULL,
 "category" text DEFAULT 'reuniao' NOT NULL,
 "status" text DEFAULT 'pending' NOT NULL,
 "mime_type" text NOT NULL,
 "extension" text NOT NULL,
 "size_bytes" integer NOT NULL,
 "consent_confirmed_at" timestamp NOT NULL,
 "recorded_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
 "transcript" text,
 "summary" text,
 "analysis" jsonb,
 "error_reason" text,
 "processing_started_at" timestamp,
 "created_at" timestamp DEFAULT now() NOT NULL,
 "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_recording_org_created_idx" ON "meeting_recording" ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_recording_status_idx" ON "meeting_recording" ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_task" (
 "id" text PRIMARY KEY NOT NULL,
 "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
 "recording_id" text NOT NULL REFERENCES "meeting_recording"("id") ON DELETE CASCADE,
 "description" text NOT NULL,
 "evidence" text,
 "source" text DEFAULT 'suggestion' NOT NULL,
 "assigned_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
 "due_at" timestamp,
 "status" text DEFAULT 'pending' NOT NULL,
 "approved_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
 "created_at" timestamp DEFAULT now() NOT NULL,
 "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_task_org_recording_idx" ON "meeting_task" ("organization_id","recording_id");
