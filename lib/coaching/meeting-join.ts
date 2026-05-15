/**
 * Whether the booking can use the in-app join flow or an external Meet URL.
 * Treats missing `meetingProvider` as LiveKit (matches server default) so admin-approved
 * bookings still surface Join before calendar sync finishes.
 */
export function coachingJoinEligible(booking: {
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
}): boolean {
  const p = (booking.meetingProvider ?? "livekit").trim().toLowerCase();
  if (p === "livekit") return true;
  return Boolean(booking.calendarMeetingUrl?.trim());
}

export function coachingJoinHref(booking: {
  id: string;
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
}): string {
  const p = (booking.meetingProvider ?? "livekit").trim().toLowerCase();
  if (p === "livekit") return `/meeting/${booking.id}`;
  const url = booking.calendarMeetingUrl?.trim();
  if (url) return url;
  return `/meeting/${booking.id}`;
}
