-- Set per-interview price to ₹199 in admin settings (singleton row).
UPDATE "admin_settings"
SET
  "data" = jsonb_set(
    COALESCE("data", '{}'::jsonb),
    '{pricePerInterviewInr}',
    '199'::jsonb,
    true
  ),
  "updated_at" = now()
WHERE "id" = 'singleton';
