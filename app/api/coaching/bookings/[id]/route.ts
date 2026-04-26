import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { sendMail } from "@/lib/email/transporter";
import { coachingApprovedEmail } from "@/lib/email/templates/coaching";
import { createCoachingCalendarEvent } from "@/lib/integrations/google-calendar";

export const runtime = "nodejs";

const Body = z.object({
  status: z
    .enum([
      "pending",
      "approved",
      "cancelled",
      "rejected",
      "refund_pending",
      "refunded",
    ])
    .optional(),
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
  await db
    .update(schema.coachingBookings)
    .set({
      status: parsed.data.status,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, params.id));

  if (parsed.data.status === "approved") {
    const rows = await db
      .select()
      .from(schema.coachingBookings)
      .where(eq(schema.coachingBookings.id, params.id))
      .limit(1);
    const booking = rows[0];
    if (booking) {
      let meetingUrl: string | null = booking.calendarMeetingUrl ?? null;
      let calendarEventId: string | null = booking.calendarEventId ?? null;
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
              updatedAt: new Date(),
            })
            .where(eq(schema.coachingBookings.id, booking.id));
        } catch (err) {
          console.error("[coaching/calendar:create]", err);
        }
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
