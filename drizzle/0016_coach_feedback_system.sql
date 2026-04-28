ALTER TABLE "coaches"
ALTER COLUMN "rating" SET DEFAULT 0;

ALTER TABLE "coaching_bookings"
ADD COLUMN IF NOT EXISTS "feedback_token_hash" text;

ALTER TABLE "coaching_bookings"
ADD COLUMN IF NOT EXISTS "feedback_requested_at" timestamp with time zone;

ALTER TABLE "coaching_bookings"
ADD COLUMN IF NOT EXISTS "feedback_submitted_at" timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS "coaching_bookings_feedback_token_hash_idx"
  ON "coaching_bookings"("feedback_token_hash");

CREATE TABLE IF NOT EXISTS "coaching_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "coaching_bookings"("id") ON DELETE CASCADE,
  "coach_id" text NOT NULL,
  "candidate_user_id" uuid NOT NULL,
  "candidate_name" text NOT NULL,
  "rating" integer NOT NULL,
  "feedback_text" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "coaching_feedback_booking_id_unique_idx"
  ON "coaching_feedback"("booking_id");
CREATE INDEX IF NOT EXISTS "coaching_feedback_coach_id_idx"
  ON "coaching_feedback"("coach_id");
CREATE INDEX IF NOT EXISTS "coaching_feedback_rating_idx"
  ON "coaching_feedback"("rating");
