import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { ok, fail } from "@/lib/api/response";
import { sendMail } from "@/lib/email/transporter";
import { coachingFeedbackRequestEmail } from "@/lib/email/templates/coaching";

export const runtime = "nodejs";

function appBase() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isAuthorized(req: Request) {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerToken =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return headerToken === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return fail("invalid_credentials", "Unauthorized cron request.", 401);
  }

  const now = new Date();
  const endedApprovedBookings = await db
    .select()
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.status, "approved"),
        isNull(schema.coachingBookings.feedbackSubmittedAt),
        isNull(schema.coachingBookings.feedbackRequestedAt),
        lte(schema.coachingBookings.startsAt, now),
      ),
    )
    .limit(200);

  let sent = 0;
  let failed = 0;
  for (const booking of endedApprovedBookings) {
    const sessionEnd = booking.startsAt.getTime() + booking.durationMin * 60 * 1000;
    if (sessionEnd > Date.now()) continue;

    const feedbackToken = randomBytes(24).toString("base64url");
    const feedbackTokenHash = hashToken(feedbackToken);
    const feedbackUrl = `${appBase()}/feedback/coach?token=${encodeURIComponent(feedbackToken)}`;
    const mail = coachingFeedbackRequestEmail({
      candidateName: booking.candidateName,
      coachName: booking.coachName,
      techArea: booking.techArea,
      startsAt: booking.startsAt.toISOString(),
      coachTimezone: booking.coachTimezone,
      feedbackUrl,
    });

    try {
      await db
        .update(schema.coachingBookings)
        .set({
          feedbackTokenHash,
          updatedAt: new Date(),
        })
        .where(eq(schema.coachingBookings.id, booking.id));

      await sendMail({
        to: booking.candidateEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });

      await db
        .update(schema.coachingBookings)
        .set({
          feedbackRequestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.coachingBookings.id, booking.id));
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error("[cron/coaching-feedback-reminders]", booking.id, err);
    }
  }

  return ok({
    scanned: endedApprovedBookings.length,
    sent,
    failed,
  });
}
