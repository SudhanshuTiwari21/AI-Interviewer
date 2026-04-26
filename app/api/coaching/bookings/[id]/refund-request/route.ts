import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

const Body = z.object({
  reason: z.string().trim().min(15).max(1000),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
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
    .where(
      and(
        eq(schema.coachingBookings.id, params.id),
        eq(schema.coachingBookings.candidateUserId, me.id),
      ),
    )
    .limit(1);
  const booking = rows[0];
  if (!booking) return fail("user_not_found", "Booking not found.", 404);
  if (booking.paymentStatus !== "paid") {
    return fail("validation_error", "Refund can be requested only for paid bookings.", 400);
  }
  if (
    booking.status === "refund_requested" ||
    booking.status === "refund_pending" ||
    booking.status === "partially_refunded"
  ) {
    return fail("validation_error", "Refund is already requested for this booking.", 409);
  }
  if (booking.status === "refunded") {
    return fail("validation_error", "This booking is already refunded.", 409);
  }

  await db
    .update(schema.coachingBookings)
    .set({
      status: "refund_requested",
      paymentStatus: "refund_requested",
      refundReason: parsed.data.reason,
      refundRequestedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, booking.id));

  await db.insert(schema.refundEvents).values({
    bookingId: booking.id,
    eventType: "requested",
    actorEmail: me.email,
    actorRole: me.role,
    note: parsed.data.reason,
    amountInr: booking.amountInr,
    metadata: {},
  });

  if (booking.paymentTransactionId) {
    await db
      .update(schema.paymentTransactions)
      .set({
        status: "refund_requested",
        updatedAt: new Date(),
      })
      .where(eq(schema.paymentTransactions.id, booking.paymentTransactionId));
  }

  return ok({ requested: true });
}
