import {
  COACHING_JOIN_EARLY_MINUTES,
  COACHING_JOIN_LATE_MINUTES,
} from "@/lib/coaching/constants";

function startMs(startsAt: string | Date): number {
  return (typeof startsAt === "string" ? new Date(startsAt) : startsAt).getTime();
}

/** End timestamp of a coaching block (start + duration). */
export function bookingEndsAtMs(startsAt: string | Date, durationMin: number): number {
  return startMs(startsAt) + durationMin * 60_000;
}

/** When the join window opens (default: 1 hour before start). */
export function bookingJoinOpensAtMs(
  startsAt: string | Date,
  earlyMin: number = COACHING_JOIN_EARLY_MINUTES,
): number {
  return startMs(startsAt) - earlyMin * 60_000;
}

/** When join is closed after session end (includes late grace, aligned with meeting token API). */
export function bookingJoinClosesAtMs(
  startsAt: string | Date,
  durationMin: number,
  lateMin: number = COACHING_JOIN_LATE_MINUTES,
): number {
  return bookingEndsAtMs(startsAt, durationMin) + lateMin * 60_000;
}

/** True when the user is inside the allowed join window (not too early, not after grace). */
export function canJoinCoachingSession(
  startsAt: string | Date,
  durationMin: number,
  earlyMin: number = COACHING_JOIN_EARLY_MINUTES,
  lateMin: number = COACHING_JOIN_LATE_MINUTES,
): boolean {
  const now = Date.now();
  return now >= bookingJoinOpensAtMs(startsAt, earlyMin) && now <= bookingJoinClosesAtMs(startsAt, durationMin, lateMin);
}

/** @deprecated Use canJoinCoachingSession for Join visibility. */
export function isBookingSessionActive(startsAt: string | Date, durationMin: number): boolean {
  return canJoinCoachingSession(startsAt, durationMin);
}

/** Session has fully ended (after late join grace). */
export function isBookingSessionEnded(startsAt: string | Date, durationMin: number): boolean {
  return Date.now() > bookingJoinClosesAtMs(startsAt, durationMin);
}

/** Join window has not opened yet. */
export function isBeforeCoachingJoinWindow(
  startsAt: string | Date,
  earlyMin: number = COACHING_JOIN_EARLY_MINUTES,
): boolean {
  return Date.now() < bookingJoinOpensAtMs(startsAt, earlyMin);
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
