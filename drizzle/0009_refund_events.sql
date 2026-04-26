CREATE TABLE IF NOT EXISTS "refund_events" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "coaching_bookings"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "actor_email" text,
  "actor_role" text,
  "note" text,
  "amount_inr" integer,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "refund_events_booking_id_idx"
  ON "refund_events" ("booking_id");

CREATE INDEX IF NOT EXISTS "refund_events_event_type_idx"
  ON "refund_events" ("event_type");
