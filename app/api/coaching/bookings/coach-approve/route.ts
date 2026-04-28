import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { sendMail } from "@/lib/email/transporter";
import { coachingApprovedEmail } from "@/lib/email/templates/coaching";
import { createCoachingCalendarEvent } from "@/lib/integrations/google-calendar";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appBase() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return Response.redirect(`${appBase()}/schedule?approved=invalid`, 302);
  }
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.coachApprovalTokenHash, tokenHash))
    .limit(1);
  const booking = rows[0];
  if (!booking) {
    return Response.redirect(`${appBase()}/schedule?approved=invalid`, 302);
  }

  if (booking.status !== "approved") {
    const feedbackToken = randomBytes(24).toString("base64url");
    const feedbackTokenHash = booking.feedbackTokenHash ?? hashToken(feedbackToken);
    let meetingUrl: string | null = booking.calendarMeetingUrl ?? null;
    let calendarEventId: string | null = booking.calendarEventId ?? null;
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
    } catch (err) {
      console.error("[coaching/calendar:create]", err);
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

  return Response.redirect(`${appBase()}/schedule?approved=1`, 302);
}
