ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "calendar_event_id" text;

ALTER TABLE "coaching_bookings"
  ADD COLUMN IF NOT EXISTS "calendar_meeting_url" text;
