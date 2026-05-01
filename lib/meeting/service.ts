import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { liveKitProvider } from "./livekit";
import type { MeetingParticipantRole } from "./provider";

function appBase() {
  const raw = (process.env.APP_URL ?? "http://localhost:3000").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function meetingProviderName() {
  return (process.env.MEETING_PROVIDER ?? "livekit").trim().toLowerCase();
}

export function getBookingJoinUrl(bookingId: string) {
  return `${appBase()}/meeting/${encodeURIComponent(bookingId)}`;
}

function roomNameForBooking(bookingId: string) {
  return `sw-${bookingId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

export async function ensureMeetingForBooking(bookingId: string) {
  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.id, bookingId))
    .limit(1);
  const booking = rows[0];
  if (!booking) {
    throw new Error("Booking not found.");
  }
  const roomName = booking.meetingRoomName || roomNameForBooking(booking.id);
  await liveKitProvider.ensureRoom({
    bookingId: booking.id,
    roomName,
    candidateName: booking.candidateName,
    coachName: booking.coachName,
    startsAtIso: booking.startsAt.toISOString(),
    durationMin: booking.durationMin,
  });
  await db
    .update(schema.coachingBookings)
    .set({
      meetingProvider: "livekit",
      meetingRoomName: roomName,
      calendarMeetingUrl: getBookingJoinUrl(booking.id),
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, booking.id));
  return {
    booking,
    roomName,
    joinUrl: getBookingJoinUrl(booking.id),
  };
}

export async function issueMeetingTokenForBooking(params: {
  bookingId: string;
  participantId: string;
  participantName: string;
  role: MeetingParticipantRole;
}) {
  const ensured = await ensureMeetingForBooking(params.bookingId);
  const issued = await liveKitProvider.issueToken({
    roomName: ensured.roomName,
    bookingId: params.bookingId,
    participantId: params.participantId,
    participantName: params.participantName,
    role: params.role,
  });
  const tokenHash = hashToken(randomBytes(16).toString("hex"));
  await db
    .update(schema.coachingBookings)
    .set({
      meetingAccessTokenHash: tokenHash,
      meetingTokenExpiresAt: new Date(issued.expiresAtIso),
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, params.bookingId));
  return {
    ...issued,
    roomName: ensured.roomName,
    meetingProvider: "livekit" as const,
  };
}
