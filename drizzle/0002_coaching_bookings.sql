-- Coaching bookings for paid 1:1 sessions.

CREATE TABLE IF NOT EXISTS "coaching_bookings" (
  "id"                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "candidate_user_id"            uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "candidate_name"               text NOT NULL,
  "candidate_email"              text NOT NULL,
  "tech_area"                    text NOT NULL,
  "coach_id"                     text NOT NULL,
  "coach_name"                   text NOT NULL,
  "coach_email"                  text NOT NULL,
  "coach_timezone"               text NOT NULL,
  "starts_at"                    timestamptz NOT NULL,
  "duration_min"                 integer NOT NULL DEFAULT 60,
  "amount_inr"                   integer NOT NULL,
  "payment_status"               text NOT NULL DEFAULT 'paid',
  "status"                       text NOT NULL DEFAULT 'pending',
  "coach_approval_token_hash"    text,
  "coach_approved_at"            timestamptz,
  "notes"                        text,
  "created_at"                   timestamptz NOT NULL DEFAULT now(),
  "updated_at"                   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "coaching_bookings_candidate_user_id_idx"
  ON "coaching_bookings" ("candidate_user_id");

CREATE INDEX IF NOT EXISTS "coaching_bookings_coach_id_idx"
  ON "coaching_bookings" ("coach_id");

CREATE INDEX IF NOT EXISTS "coaching_bookings_status_idx"
  ON "coaching_bookings" ("status");

CREATE UNIQUE INDEX IF NOT EXISTS "coaching_bookings_coach_approval_token_hash_idx"
  ON "coaching_bookings" ("coach_approval_token_hash");
