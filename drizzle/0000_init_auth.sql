-- Hiro auth schema (initial)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "users" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"              text NOT NULL,
  "password_hash"      text NOT NULL,
  "name"               text NOT NULL,
  "email_verified"     boolean NOT NULL DEFAULT false,
  "email_verified_at"  timestamptz,
  "plan"               text NOT NULL DEFAULT 'free',
  "role"               text NOT NULL DEFAULT 'user',
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx"
  ON "users" (LOWER("email"));

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash"   text NOT NULL UNIQUE,
  "expires_at"   timestamptz NOT NULL,
  "consumed_at"  timestamptz,
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_idx"
  ON "email_verification_tokens" ("user_id");

CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx"
  ON "email_verification_tokens" ("expires_at");
