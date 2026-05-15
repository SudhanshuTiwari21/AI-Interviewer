CREATE TABLE IF NOT EXISTS "coaching_slot_holds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coach_id" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "user_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "coaching_slot_holds_coach_slot_unique_idx"
  ON "coaching_slot_holds" ("coach_id", "starts_at");

CREATE INDEX IF NOT EXISTS "coaching_slot_holds_coach_id_idx"
  ON "coaching_slot_holds" ("coach_id");

CREATE INDEX IF NOT EXISTS "coaching_slot_holds_expires_at_idx"
  ON "coaching_slot_holds" ("expires_at");

CREATE INDEX IF NOT EXISTS "coaching_slot_holds_user_id_idx"
  ON "coaching_slot_holds" ("user_id");
