import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { requireCoach } from "@/lib/auth/coach";
import { sendMail } from "@/lib/email/transporter";
import {
  coachingApprovedEmail,
  coachingApprovedEmailToCoach,
} from "@/lib/email/templates/coaching";
import { createCoachingCalendarEvent } from "@/lib/integrations/google-calendar";
import { ensureMeetingForBooking, meetingProviderName } from "@/lib/meeting/service";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

const Body = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;
  const coachUser = auth.user;

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

  const coachRows = await db
    .select({ id: schema.coaches.id })
    .from(schema.coaches)
    .where(eq(schema.coaches.email, coachUser.email))
    .limit(20);
  const coachIds = coachRows.map((x) => x.id);
  if (coachIds.length === 0) {
    return fail("validation_error", "Coach profile not found.", 404);
  }

  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.id, params.id),
        eq(schema.coachingBookings.coachEmail, coachUser.email),
        inArray(schema.coachingBookings.coachId, coachIds),
      ),
    )
    .limit(1);
  const booking = rows[0];
  if (!booking) return fail("user_not_found", "Booking not found.", 404);

  if (parsed.data.action === "reject") {
    await db
      .update(schema.coachingBookings)
      .set({
        status: "rejected",
        coachApprovalTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.coachingBookings.id, booking.id));
    return ok({ updated: true, status: "rejected" });
  }

  let meetingUrl: string | null = booking.calendarMeetingUrl ?? null;
  let calendarEventId: string | null = booking.calendarEventId ?? null;
  const feedbackToken = randomBytes(24).toString("base64url");
  const feedbackTokenHash = booking.feedbackTokenHash ?? hashToken(feedbackToken);
  try {
    if (meetingProviderName() === "livekit") {
      const ensured = await ensureMeetingForBooking(booking.id);
      meetingUrl = ensured.joinUrl;
      calendarEventId = null;
    } else {
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
      meetingUrl = calendarEvent.meetLink ?? null;
      calendarEventId = calendarEvent.eventId || null;
    }
  } catch (err) {
    console.error("[coach/calendar:create]", err);
  }

  await db
    .update(schema.coachingBookings)
    .set({
      status: "approved",
      coachApprovedAt: new Date(),
      coachApprovalTokenHash: null,
      feedbackTokenHash,
      calendarMeetingUrl: meetingUrl,
      calendarEventId,
      meetingProvider: meetingProviderName(),
      updatedAt: new Date(),
    })
    .where(eq(schema.coachingBookings.id, booking.id));

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
  const coachMail = coachingApprovedEmailToCoach({
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
  try {
    await sendMail({
      to: booking.candidateEmail,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  } catch (err) {
    console.error("[coach/approved-email:candidate]", err);
  }
  try {
    await sendMail({
      to: booking.coachEmail,
      subject: coachMail.subject,
      html: coachMail.html,
      text: coachMail.text,
    });
  } catch (err) {
    console.error("[coach/approved-email:coach]", err);
  }
  if (process.env.ADMIN_EMAIL) {
    const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
    const coachEmail = normalizeEmail(booking.coachEmail);
    const candidateEmail = normalizeEmail(booking.candidateEmail);
    const shouldSendAdminMail =
      Boolean(adminEmail) &&
      adminEmail !== coachEmail &&
      adminEmail !== candidateEmail;
    if (shouldSendAdminMail) {
      try {
        await sendMail({
          to: process.env.ADMIN_EMAIL,
          subject: `[Admin Copy] ${mail.subject}`,
          html: mail.html,
          text: mail.text,
        });
      } catch (err) {
        console.error("[coach/approved-email:admin]", err);
      }
    }
  }

  return ok({ updated: true, status: "approved" });
}
