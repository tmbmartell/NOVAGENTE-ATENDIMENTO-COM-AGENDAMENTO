CREATE TABLE IF NOT EXISTS "contact_service_note" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "contact_id" text NOT NULL REFERENCES "contact"("id") ON DELETE CASCADE,
  "author_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "category" text DEFAULT 'geral' NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_service_note_org_contact_idx"
  ON "contact_service_note" ("organization_id", "contact_id", "created_at");
