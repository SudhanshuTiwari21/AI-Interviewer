CREATE TABLE IF NOT EXISTS "coaches" (
  "id"              text PRIMARY KEY,
  "name"            text NOT NULL,
  "email"           text NOT NULL,
  "title"           text NOT NULL,
  "rating"          integer NOT NULL DEFAULT 48,
  "sessions"        integer NOT NULL DEFAULT 0,
  "focus"           jsonb NOT NULL DEFAULT '[]'::jsonb,
  "tech_areas"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  "hourly_rate_inr" integer NOT NULL DEFAULT 999,
  "active"          boolean NOT NULL DEFAULT true,
  "timezone"        text NOT NULL DEFAULT 'Asia/Kolkata',
  "availability"    jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "coaches_active_idx"
  ON "coaches" ("active");

CREATE TABLE IF NOT EXISTS "interview_reports" (
  "id"           text PRIMARY KEY,
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "candidate"    text NOT NULL,
  "email"        text NOT NULL,
  "role"         text NOT NULL,
  "level"        text NOT NULL,
  "overall"      integer NOT NULL,
  "rating"       text NOT NULL,
  "duration_min" integer NOT NULL,
  "generated_at" timestamptz NOT NULL,
  "report_data"  jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "interview_reports_user_id_idx"
  ON "interview_reports" ("user_id");

CREATE INDEX IF NOT EXISTS "interview_reports_generated_at_idx"
  ON "interview_reports" ("generated_at" DESC);
