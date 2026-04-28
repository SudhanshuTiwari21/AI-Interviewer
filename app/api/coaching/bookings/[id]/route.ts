import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { sendMail } from "@/lib/email/transporter";
import {
  coachingApprovedEmail,
  coachingRefundApprovedEmail,
  coachingRefundRejectedEmail,
} from "@/lib/email/templates/coaching";
import { createCoachingCalendarEvent } from "@/lib/integrations/google-calendar";
import { getRazorpayClient } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const Body = z.object({
  status: z
    .enum([
      "pending",
      "approved",
      "cancelled",
      "rejected",
      "refund_requested",
      "refund_pending",
      "partially_refunded",
      "refunded",
    ])
    .optional(),
  action: z.enum(["approve_refund", "reject_refund"]).optional(),
  refundAmountInr: z.number().int().positive().optional(),
  refundAdminNote: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me) return fail("invalid_credentials", "Please sign in first.", 401);
  const isAdmin =
    me.role === "admin" || me.role === "super_admin" || me.role === "sub_admin";
  if (!isAdmin) return fail("validation_error", "Only admins can update bookings.", 403);

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
    .where(eq(schema.coachingBookings.id, params.id))
    .limit(1);
  const booking = rows[0];
  if (!booking) return fail("user_not_found", "Booking not found.", 404);

  if (parsed.data.action === "reject_refund") {
    if (booking.status !== "refund_requested" && booking.status !== "refund_pending") {
      return fail("validation_error", "No active refund request for this booking.", 400);
    }
    await db
      .update(schema.coachingBookings)
      .set({
        status: "approved",
        paymentStatus: "paid",
        notes: parsed.data.refundAdminNote ?? parsed.data.notes ?? booking.notes,
        refundReviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.coachingBookings.id, params.id));
    await db.insert(schema.refundEvents).values({
      bookingId: booking.id,
      eventType: "rejected",
      actorEmail: me.email,
      actorRole: me.role,
      note: parsed.data.refundAdminNote ?? parsed.data.notes ?? null,
      amountInr: booking.amountInr,
      metadata: {},
    });
    if (booking.paymentTransactionId) {
      await db
        .update(schema.paymentTransactions)
        .set({
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentTransactions.id, booking.paymentTransactionId));
    }
    const mail = coachingRefundRejectedEmail({
      bookingId: booking.id,
      candidateName: booking.candidateName,
      techArea: booking.techArea,
      amountInr: booking.amountInr,
      adminNote: parsed.data.refundAdminNote ?? parsed.data.notes ?? null,
    });
    await sendMail({
      to: booking.candidateEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return ok({ updated: true, refundRejected: true });
  }

  if (parsed.data.action === "approve_refund") {
    if (!booking.razorpayPaymentId) {
      return fail("validation_error", "Missing payment reference for refund.", 400);
    }
    if (booking.status !== "refund_requested" && booking.status !== "refund_pending") {
      return fail("validation_error", "No active refund request for this booking.", 400);
    }
    const refundAmountInr = parsed.data.refundAmountInr ?? booking.amountInr;
    if (refundAmountInr <= 0 || refundAmountInr > booking.amountInr) {
      return fail("validation_error", "Refund amount must be within paid amount.", 400);
    }
    const razorpay = getRazorpayClient();
    const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
      amount: refundAmountInr * 100,
      speed: "normal",
      notes: {
        bookingId: booking.id,
        candidateEmail: booking.candidateEmail,
      },
    });

    const isFullRefund = refundAmountInr === booking.amountInr;
    const nextPaymentStatus =
      refund.status === "processed"
        ? isFullRefund
          ? "refunded"
          : "partially_refunded"
        : "refund_pending";
    await db
      .update(schema.coachingBookings)
      .set({
        status: nextPaymentStatus,
        paymentStatus: nextPaymentStatus,
        razorpayRefundId: refund.id ?? booking.razorpayRefundId,
        notes: parsed.data.refundAdminNote ?? parsed.data.notes ?? booking.notes,
        refundReviewedAt: new Date(),
        refundProcessedAt: refund.status === "processed" ? new Date() : booking.refundProcessedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.coachingBookings.id, params.id));
    await db.insert(schema.refundEvents).values({
      bookingId: booking.id,
      eventType: "approved",
      actorEmail: me.email,
      actorRole: me.role,
      note: parsed.data.refundAdminNote ?? parsed.data.notes ?? null,
      amountInr: refundAmountInr,
      metadata: {
        refundId: refund.id ?? null,
        refundStatus: refund.status ?? null,
        isPartial: !isFullRefund,
      },
    });
    if (booking.paymentTransactionId) {
      await db
        .update(schema.paymentTransactions)
        .set({
          status: nextPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentTransactions.id, booking.paymentTransactionId));
    }
    const approvedMail = coachingRefundApprovedEmail({
      bookingId: booking.id,
      candidateName: booking.candidateName,
      techArea: booking.techArea,
      refundAmountInr,
      remainingAmountInr: Math.max(0, booking.amountInr - refundAmountInr),
      adminNote: parsed.data.refundAdminNote ?? parsed.data.notes ?? null,
      status: nextPaymentStatus,
    });
    await sendMail({
      to: booking.candidateEmail,
      subject: approvedMail.subject,
      html: approvedMail.html,
      text: approvedMail.text,
    });
    return ok({
      updated: true,
      refundInitiated: true,
      refundStatus: nextPaymentStatus,
      refundId: refund.id ?? null,
    });
  }

  let nextPaymentStatus:
    | "refund_requested"
    | "refund_pending"
    | "partially_refunded"
    | "refunded"
    | undefined;
  if (parsed.data.status === "refund_requested") {
    nextPaymentStatus = "refund_requested";
  } else if (parsed.data.status === "refund_pending") {
    nextPaymentStatus = "refund_pending";
  } else if (parsed.data.status === "partially_refunded") {
    nextPaymentStatus = "partially_refunded";
  } else if (parsed.data.status === "refunded") {
    nextPaymentStatus = "refunded";
  }
  await db
    .update(schema.coachingBookings)
    .set({
      status: parsed.data.status,
      paymentStatus: nextPaymentStatus,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, params.id));

  if (nextPaymentStatus && booking.paymentTransactionId) {
      await db
        .update(schema.paymentTransactions)
        .set({
          status: nextPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.paymentTransactions.id, booking.paymentTransactionId));
  }

  if (parsed.data.status === "approved") {
    if (booking) {
      let meetingUrl: string | null = booking.calendarMeetingUrl ?? null;
      let calendarEventId: string | null = booking.calendarEventId ?? null;
      const feedbackToken = randomBytes(24).toString("base64url");
      const feedbackTokenHash =
        booking.feedbackTokenHash ?? hashToken(feedbackToken);
      if (!meetingUrl) {
        try {
          const calendarEvent = await createCoachingCalendarEvent({
            summary: `SelectWise Coaching · ${booking.techArea}`,
            description: `Candidate: ${booking.candidateName}\nCoach: ${booking.coachName}\nBooking ID: ${booking.id}`,
            startsAtIso: booking.startsAt.toISOString(),
            durationMin: booking.durationMin,
            timezone: booking.coachTimezone || "Asia/Kolkata",
            attendeeEmails: [
              booking.candidateEmail,
              booking.coachEmail,
              process.env.ADMIN_EMAIL ?? "",
            ],
          });
          meetingUrl = calendarEvent.meetLink ?? calendarEvent.htmlLink ?? null;
          calendarEventId = calendarEvent.eventId || null;
          await db
            .update(schema.coachingBookings)
            .set({
              calendarMeetingUrl: meetingUrl,
              calendarEventId,
              coachApprovedAt: new Date(),
              feedbackTokenHash,
              updatedAt: new Date(),
            })
            .where(eq(schema.coachingBookings.id, booking.id));
        } catch (err) {
          console.error("[coaching/calendar:create]", err);
        }
      }
      if (booking.feedbackTokenHash === null) {
        await db
          .update(schema.coachingBookings)
          .set({
            feedbackTokenHash,
            updatedAt: new Date(),
          })
          .where(eq(schema.coachingBookings.id, booking.id));
      }
      const mail = coachingApprovedEmail({
        bookingId: booking.id,
        candidateName: booking.candidateName,
        candidateEmail: booking.candidateEmail,
        techArea: booking.techArea,
        coachName: booking.coachName,
        startsAt: booking.startsAt.toISOString(),
        amountInr: booking.amountInr,
        meetingUrl,
        coachTimezone: booking.coachTimezone,
      });
      await sendMail({
        to: booking.candidateEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (process.env.ADMIN_EMAIL) {
        await sendMail({
          to: process.env.ADMIN_EMAIL,
          subject: `[Admin Copy] ${mail.subject}`,
          html: mail.html,
          text: mail.text,
        });
      }
    }
  }
  return ok({ updated: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me) return fail("invalid_credentials", "Please sign in first.", 401);
  const isAdmin =
    me.role === "admin" || me.role === "super_admin" || me.role === "sub_admin";

  if (isAdmin) {
    await db.delete(schema.coachingBookings).where(eq(schema.coachingBookings.id, params.id));
    return ok({ deleted: true });
  }

  await db
    .delete(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.id, params.id),
        eq(schema.coachingBookings.candidateUserId, me.id),
      ),
    );
  return ok({ deleted: true });
}
