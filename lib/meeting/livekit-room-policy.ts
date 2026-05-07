import "server-only";

function intEnv(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Seconds with no participants before the room is closed (LiveKit `emptyTimeout`). */
export function liveKitRoomEmptyTimeoutSec() {
  return intEnv("LIVEKIT_ROOM_EMPTY_TIMEOUT_SEC", 600);
}

/** Grace period after the last participant leaves before the room closes (`departureTimeout`). */
export function liveKitRoomDepartureTimeoutSec() {
  return intEnv("LIVEKIT_ROOM_DEPARTURE_TIMEOUT_SEC", 300);
}

/**
 * Access-token TTL for meeting joins. Clamped between min/max and padded beyond scheduled duration.
 */
export function liveKitMeetingTokenTtlSec(durationMin: number) {
  const minSec = intEnv("LIVEKIT_TOKEN_TTL_MIN_SEC", 900);
  const maxSec = intEnv("LIVEKIT_TOKEN_TTL_MAX_SEC", 14_400);
  const padMin = intEnv("LIVEKIT_TOKEN_TTL_PAD_MIN", 45);
  const fromBooking = (durationMin + padMin) * 60;
  return Math.min(maxSec, Math.max(minSec, fromBooking));
}

/** After scheduled end + this many minutes, a booking still marked `active` is closed by cron. */
export function meetingStaleActiveGraceMin() {
  return intEnv("MEETING_STALE_ACTIVE_GRACE_MIN", 120);
}
