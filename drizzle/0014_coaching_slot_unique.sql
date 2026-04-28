CREATE UNIQUE INDEX IF NOT EXISTS "coaching_bookings_coach_slot_unique_idx"
  ON "coaching_bookings"("coach_id", "starts_at");
