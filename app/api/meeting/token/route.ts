import "server-only";

import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { resolveMeetingRoleForBooking } from "@/lib/meeting/participant-role";
import { issueMeetingTokenForBooking, meetingProviderName } from "@/lib/meeting/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  bookingId: z.string().uuid(),
});

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

  const { booking, role } = await resolveMeetingRoleForBooking(parsed.data.bookingId, me.id, me.email);
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
