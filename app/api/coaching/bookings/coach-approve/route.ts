import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { sendMail } from "@/lib/email/transporter";
import {
  coachingApprovedEmail,
  coachingApprovedEmailToCoach,
} from "@/lib/email/templates/coaching";
import { createCoachingCalendarEvent } from "@/lib/integrations/google-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appBase() {
  const raw = (process.env.APP_URL ?? "http://localhost:3000").trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
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

    const justApproved = booking.status !== "approved";
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
        meetingUrl = calendarEvent.meetLink ?? null;
        calendarEventId = calendarEvent.eventId || null;
      } catch (err) {
        console.error("[coaching/calendar:create]", err);
      }
    }

    if (justApproved) {
      const feedbackToken = randomBytes(24).toString("base64url");
      const feedbackTokenHash = booking.feedbackTokenHash ?? hashToken(feedbackToken);
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
    } else if (meetingUrl && !booking.calendarMeetingUrl) {
      await db
        .update(schema.coachingBookings)
        .set({
          calendarMeetingUrl: meetingUrl,
          calendarEventId,
          updatedAt: new Date(),
        })
        .where(eq(schema.coachingBookings.id, booking.id));
    }

    if (justApproved || (meetingUrl && !booking.calendarMeetingUrl)) {
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
        console.error("[coaching/approved-email:candidate]", err);
      }
      try {
        await sendMail({
          to: booking.coachEmail,
          subject: coachMail.subject,
          html: coachMail.html,
          text: coachMail.text,
        });
      } catch (err) {
        console.error("[coaching/approved-email:coach]", err);
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
            console.error("[coaching/approved-email:admin]", err);
          }
        }
      }
    }
  } catch (err) {
    console.error("[coaching/coach-approve]", err);
    return Response.redirect(`${appBase()}/schedule?approved=error`, 302);
  }

  return Response.redirect(`${appBase()}/schedule?approved=1`, 302);
}
