import "server-only";

import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const SubmitBody = z.object({
  token: z.string().trim().min(12),
  rating: z.number().int().min(1).max(5),
  feedbackText: z.string().trim().max(1200).optional(),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionIsOver(startsAt: Date, durationMin: number) {
  return startsAt.getTime() + durationMin * 60 * 1000 <= Date.now();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return fail("validation_error", "Missing feedback token.", 400);

  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.feedbackTokenHash, tokenHash))
    .limit(1);
  const booking = rows[0];
  if (!booking) {
    return fail("validation_error", "This feedback link is invalid or expired.", 404);
  }

  const existing = await db
    .select({ id: schema.coachingFeedback.id })
    .from(schema.coachingFeedback)
    .where(eq(schema.coachingFeedback.bookingId, booking.id))
    .limit(1);
  const alreadySubmitted = existing.length > 0 || Boolean(booking.feedbackSubmittedAt);
  const canSubmit = !alreadySubmitted && sessionIsOver(booking.startsAt, booking.durationMin);

  return ok({
    booking: {
      id: booking.id,
      coachName: booking.coachName,
      techArea: booking.techArea,
      startsAt: booking.startsAt.toISOString(),
      durationMin: booking.durationMin,
      candidateName: booking.candidateName,
    },
    alreadySubmitted,
    canSubmit,
    message: canSubmit
      ? null
      : alreadySubmitted
        ? "Feedback already submitted for this session."
        : "You can submit feedback after the session is complete.",
  });
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }

  const parsed = SubmitBody.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }
  const body = parsed.data;
  const tokenHash = hashToken(body.token);
  const bookingRows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.feedbackTokenHash, tokenHash))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) {
    return fail("validation_error", "This feedback link is invalid or expired.", 404);
  }
  if (!sessionIsOver(booking.startsAt, booking.durationMin)) {
    return fail("validation_error", "Feedback opens after the session ends.", 400);
  }
  const existing = await db
    .select({ id: schema.coachingFeedback.id })
    .from(schema.coachingFeedback)
    .where(eq(schema.coachingFeedback.bookingId, booking.id))
    .limit(1);
  if (existing.length > 0 || booking.feedbackSubmittedAt) {
    return fail("validation_error", "Feedback already submitted for this session.", 409);
  }

  const feedbackText = body.feedbackText?.trim() || null;
  await db.insert(schema.coachingFeedback).values({
    bookingId: booking.id,
    coachId: booking.coachId,
    candidateUserId: booking.candidateUserId,
    candidateName: booking.candidateName,
    rating: body.rating,
    feedbackText,
  });
  await db
    .update(schema.coachingBookings)
    .set({
      feedbackSubmittedAt: new Date(),
      feedbackTokenHash: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.coachingBookings.id, booking.id),
        eq(schema.coachingBookings.feedbackTokenHash, tokenHash),
      ),
    );

  return ok({ submitted: true });
}
