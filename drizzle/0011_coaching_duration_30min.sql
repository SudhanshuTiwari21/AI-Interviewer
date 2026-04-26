ALTER TABLE "coaching_bookings"
  ALTER COLUMN "duration_min" SET DEFAULT 30;

UPDATE "coaching_bookings"
SET "duration_min" = 30
WHERE "duration_min" IS DISTINCT FROM 30;
