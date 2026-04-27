CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "timezone" text NOT NULL DEFAULT 'Asia/Kolkata',
  "email_notifications" boolean NOT NULL DEFAULT true,
  "interview_reminders" boolean NOT NULL DEFAULT true,
  "marketing_emails" boolean NOT NULL DEFAULT false,
  "default_interview_type" text,
  "default_company_type" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_unique_idx"
  ON "user_settings"("user_id");
CREATE INDEX IF NOT EXISTS "user_settings_user_id_idx"
  ON "user_settings"("user_id");

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_email" text NOT NULL,
  "user_name" text NOT NULL,
  "category" text NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "priority" text NOT NULL DEFAULT 'medium',
  "admin_note" text,
  "resolved_at" timestamptz,
  "resolved_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx"
  ON "support_tickets"("user_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx"
  ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_category_idx"
  ON "support_tickets"("category");
