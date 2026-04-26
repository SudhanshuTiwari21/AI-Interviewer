CREATE TABLE IF NOT EXISTS "razorpay_webhook_events" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id"          text NOT NULL UNIQUE,
  "event_type"        text NOT NULL,
  "payload"           jsonb NOT NULL DEFAULT '{}'::jsonb,
  "processed_at"      timestamptz,
  "processing_status" text NOT NULL DEFAULT 'received',
  "error_message"     text,
  "created_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_event_type_idx"
  ON "razorpay_webhook_events" ("event_type");

CREATE INDEX IF NOT EXISTS "razorpay_webhook_events_status_idx"
  ON "razorpay_webhook_events" ("processing_status");
