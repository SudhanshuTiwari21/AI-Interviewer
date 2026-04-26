ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "razorpay_refund_id" text;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "refund_reason" text;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "refund_requested_at" timestamptz;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "refund_reviewed_at" timestamptz;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "refund_processed_at" timestamptz;
