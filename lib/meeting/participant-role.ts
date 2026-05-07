import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { CoachingBookingRow } from "@/lib/db/schema";
import type { MeetingParticipantRole } from "./provider";

export type ResolvedMeetingParticipant = {
  role: MeetingParticipantRole;
  /** Canonical display name for transcripts (from booking, not client-supplied). */
  speakerName: string;
};

/**
 * Resolves whether the signed-in user is the candidate or assigned coach for this booking.
 * Matches the rules used by `/api/meeting/token` so transcript attribution cannot diverge from join authorization.
 */
export async function resolveMeetingParticipantForBooking(
  booking: CoachingBookingRow,
  userId: string,
  email: string,
): Promise<ResolvedMeetingParticipant | null> {
  if (booking.candidateUserId === userId) {
    return { role: "candidate", speakerName: booking.candidateName };
  }

  const coachRows = await db
    .select({ id: schema.coaches.id })
    .from(schema.coaches)
    .where(eq(schema.coaches.email, email))
    .limit(20);
  const coachIds = coachRows.map((r) => r.id);
  if (
    coachIds.length > 0 &&
    booking.coachEmail.toLowerCase() === email.toLowerCase() &&
    coachIds.includes(booking.coachId)
  ) {
    return { role: "coach", speakerName: booking.coachName };
  }

  return null;
}

export async function resolveMeetingRoleForBooking(
  bookingId: string,
  userId: string,
  email: string,
): Promise<
  | { booking: CoachingBookingRow; role: MeetingParticipantRole }
  | { booking: null; role: null }
  | { booking: CoachingBookingRow; role: null }
> {
  const bookingRows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.id, bookingId))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) return { booking: null, role: null };

  const resolved = await resolveMeetingParticipantForBooking(booking, userId, email);
  if (!resolved) return { booking, role: null };
  return { booking, role: resolved.role };
}
