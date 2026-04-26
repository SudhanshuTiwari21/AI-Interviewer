CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_type"        text NOT NULL,
  "reference_id"        text,
  "amount_inr"          integer NOT NULL,
  "currency"            text NOT NULL DEFAULT 'INR',
  "status"              text NOT NULL DEFAULT 'created',
  "razorpay_order_id"   text NOT NULL UNIQUE,
  "razorpay_payment_id" text,
  "razorpay_signature"  text,
  "metadata"            jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_transactions_user_id_idx"
  ON "payment_transactions" ("user_id");

CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx"
  ON "payment_transactions" ("status");

CREATE INDEX IF NOT EXISTS "payment_transactions_product_type_idx"
  ON "payment_transactions" ("product_type");

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "payment_transaction_id" uuid;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "razorpay_order_id" text;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "razorpay_payment_id" text;
