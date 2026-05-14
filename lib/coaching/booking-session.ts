/** End timestamp of a coaching block (start + duration). */
export function bookingEndsAtMs(startsAt: string | Date, durationMin: number): number {
  const t = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  return t.getTime() + durationMin * 60_000;
}

/** True while the scheduled session window has not fully ended (no join after this). */
export function isBookingSessionActive(startsAt: string | Date, durationMin: number): boolean {
  return Date.now() <= bookingEndsAtMs(startsAt, durationMin);
}

/** Upcoming = start in the future. Past = end in the past. Otherwise ongoing (inclusive of live window). */
export function bookingListCategory(
  startsAt: string | Date,
  durationMin: number,
): "upcoming" | "ongoing" | "past" {
  const startMs = (typeof startsAt === "string" ? new Date(startsAt) : startsAt).getTime();
  const endMs = bookingEndsAtMs(startsAt, durationMin);
  const now = Date.now();
  if (now < startMs) return "upcoming";
  if (now > endMs) return "past";
  return "ongoing";
}
