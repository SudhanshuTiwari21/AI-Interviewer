import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

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

  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.id, parsed.data.bookingId))
    .limit(1);
  const booking = rows[0];
  if (!booking) return fail("user_not_found", "Booking not found.", 404);

  const emailLower = me.email.toLowerCase();
  const canTouch =
    booking.candidateUserId === me.id || booking.coachEmail.toLowerCase() === emailLower;
  if (!canTouch) return fail("validation_error", "Not allowed to start this session.", 403);

  await db
    .update(schema.coachingBookings)
    .set({
      meetingStatus: "active",
      meetingStartedAt: booking.meetingStartedAt ?? new Date(),
      recordingStatus: "recording",
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, booking.id));

  return ok({ started: true });
}
