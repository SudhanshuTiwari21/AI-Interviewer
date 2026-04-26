-- Selectwise RBAC: status column, audit log, admin settings.

-- 1. User status (active/suspended). Defaults to 'active' so existing rows stay valid.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz;

-- 2. Audit log: tracks every privileged action taken by an admin.
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id"    uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "actor_email" text NOT NULL,
  "actor_role"  text NOT NULL,
  "action"      text NOT NULL,
  "target_type" text,
  "target_id"   text,
  "metadata"    jsonb NOT NULL DEFAULT '{}'::jsonb,
  "ip"          text,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx"
  ON "audit_logs" ("actor_id");

CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx"
  ON "audit_logs" ("created_at" DESC);

-- 3. Admin settings (single-row, key/value style). One JSON document keeps it flexible.
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id"         text PRIMARY KEY DEFAULT 'singleton',
  "data"       jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
);

INSERT INTO "admin_settings" ("id", "data")
VALUES ('singleton', '{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;
