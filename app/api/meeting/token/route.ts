import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { issueMeetingTokenForBooking, meetingProviderName } from "@/lib/meeting/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  bookingId: z.string().uuid(),
});

async function resolveRoleForBooking(bookingId: string, userId: string, email: string) {
  const bookingRows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.id, bookingId))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) return { booking: null, role: null as null | "candidate" | "coach" };
  if (booking.candidateUserId === userId) return { booking, role: "candidate" as const };

  const coachRows = await db
    .select({ id: schema.coaches.id })
    .from(schema.coaches)
    .where(eq(schema.coaches.email, email))
    .limit(20);
  const coachIds = coachRows.map((x) => x.id);
  if (
    coachIds.length > 0 &&
    booking.coachEmail.toLowerCase() === email.toLowerCase() &&
    coachIds.includes(booking.coachId)
  ) {
    return { booking, role: "coach" as const };
  }
  return { booking, role: null };
}

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me) return fail("invalid_credentials", "Please sign in first.", 401);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { booking, role } = await resolveRoleForBooking(parsed.data.bookingId, me.id, me.email);
  if (!booking || !role) {
    return fail("validation_error", "You are not allowed to join this meeting.", 403);
  }
  if (booking.status !== "approved") {
    return fail("validation_error", "Meeting is available only for approved bookings.", 400);
  }
  const now = Date.now();
  const startsAt = booking.startsAt.getTime();
  const endsAt = startsAt + booking.durationMin * 60_000;
  const joinOpenAt = startsAt - 30 * 60_000;
  const joinCloseAt = endsAt + 2 * 60 * 60_000;
  if (now < joinOpenAt || now > joinCloseAt) {
    return fail("validation_error", "Meeting access window is closed.", 400);
  }

  if (meetingProviderName() !== "livekit") {
    return fail("validation_error", "Meeting provider is not configured for token mode.", 400);
  }

  const issued = await issueMeetingTokenForBooking({
    bookingId: booking.id,
    participantId: me.id,
    participantName: me.name,
    role,
  });

  return ok({
    provider: issued.meetingProvider,
    roomName: issued.roomName,
    token: issued.token,
    wsUrl: issued.wsUrl,
    role,
    expiresAt: issued.expiresAtIso,
  });
}
