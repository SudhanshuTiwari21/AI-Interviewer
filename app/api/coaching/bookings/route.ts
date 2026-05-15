import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { suspendResponseIfNeeded } from "@/lib/auth/account-status";
import { findUserById } from "@/lib/auth/verification-service";
import { sendMail } from "@/lib/email/transporter";
import {
  coachingRequestEmailToAdmin,
  coachingRequestEmailToCandidate,
  coachingRequestEmailToCoach,
} from "@/lib/email/templates/coaching";
import { DEFAULT_COACHING_SESSION_MINUTES } from "@/lib/coaching/constants";
import { getCoachById } from "@/lib/server/coaches";

export const runtime = "nodejs";

const Body = z.object({
  techArea: z.string().trim().min(2).max(120),
  coachId: z.string().trim().min(2),
  coachName: z.string().trim().min(2),
  coachEmail: z.string().trim().email(),
  coachTimezone: z.string().trim().min(2).max(100).optional(),
  startsAt: z
    .string()
    .min(16)
    .max(44)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid slot time."),
  amountInr: z.number().int().positive(),
  paymentTransactionId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return ok({ bookings: [] });
  const me = await findUserById(session.sub);
  if (!me) return ok({ bookings: [] });

  const isAdmin =
    me.role === "admin" || me.role === "super_admin" || me.role === "sub_admin";
  const where = isAdmin
    ? undefined
    : eq(schema.coachingBookings.candidateUserId, me.id);

  const q = db
    .select()
    .from(schema.coachingBookings)
    .orderBy(desc(schema.coachingBookings.createdAt));
  const rows = where ? await q.where(where).limit(200) : await q.limit(200);
  return ok({ bookings: rows });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me?.emailVerified)
    return fail("invalid_credentials", "Please sign in first.", 401);
  const suspended = suspendResponseIfNeeded(me);
  if (suspended) return suspended;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return fail(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
    );
  }
  const body = parsed.data;
  const coachTimezone = body.coachTimezone?.trim() || "UTC";
  const tx = await db
    .select()
    .from(schema.paymentTransactions)
    .where(
      and(
        eq(schema.paymentTransactions.id, body.paymentTransactionId),
        eq(schema.paymentTransactions.userId, me.id),
      ),
    )
    .limit(1);
  const paymentTx = tx[0];
  if (paymentTx?.status !== "paid") {
    return fail(
      "validation_error",
      "Verified payment is required before booking.",
      400,
    );
  }
  if (paymentTx.productType !== "coaching") {
    return fail("validation_error", "Invalid payment type for coaching.", 400);
  }
  if (
    Number(paymentTx.amountInr) !== Number(body.amountInr) ||
    paymentTx.razorpayOrderId !== body.razorpayOrderId ||
    paymentTx.razorpayPaymentId !== body.razorpayPaymentId
  ) {
    return fail("validation_error", "Payment details mismatch.", 400);
  }
  const startsAt = new Date(body.startsAt);
  if (startsAt.getTime() <= Date.now()) {
    return fail("validation_error", "Please select a future slot.", 400);
  }

  const coachProfile = await getCoachById(body.coachId);
  if (!coachProfile?.active) {
    return fail("validation_error", "Coach not found or inactive.", 400);
  }
  const coachEmailNorm = coachProfile.email.trim().toLowerCase();
  if (coachEmailNorm !== body.coachEmail.trim().toLowerCase()) {
    return fail("validation_error", "Coach details do not match our records. Refresh and try again.", 400);
  }
  const durationMin = Math.min(
    180,
    Math.max(
      15,
      Math.round(coachProfile.availability.slotStepMin ?? DEFAULT_COACHING_SESSION_MINUTES),
    ),
  );
  const conflicting = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, body.coachId),
        eq(schema.coachingBookings.startsAt, startsAt),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    )
    .limit(1);
  if (conflicting[0]) {
    return fail("validation_error", "This slot was just booked. Pick another slot.", 409);
  }

  const rawToken = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(rawToken);
  let created: typeof schema.coachingBookings.$inferSelect;
  try {
    const createdRows = await db
      .insert(schema.coachingBookings)
      .values({
        candidateUserId: me.id,
        candidateName: me.name,
        candidateEmail: me.email,
        techArea: body.techArea,
        coachId: body.coachId,
        coachName: body.coachName,
        coachEmail: body.coachEmail,
        coachTimezone,
        startsAt,
        durationMin,
        amountInr: body.amountInr,
        paymentStatus: "paid",
        paymentTransactionId: body.paymentTransactionId,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: body.razorpayPaymentId,
        status: "pending",
        coachApprovalTokenHash: tokenHash,
      })
      .returning();
    created = createdRows[0];
    if (!created?.id) {
      return fail("internal_error", "Booking could not be created. Please contact support.", 500);
    }
  } catch (error: any) {
    if (error?.code === "23505") {
      return fail("validation_error", "This slot was just booked. Pick another slot.", 409);
    }
    throw error;
  }

  const approvalUrl = `${baseUrl()}/api/coaching/bookings/coach-approve?token=${encodeURIComponent(rawToken)}`;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const coachEmail = body.coachEmail.trim().toLowerCase();
  const candidateEmail = me.email.trim().toLowerCase();

  const coachMail = coachingRequestEmailToCoach({
    bookingId: created.id,
    candidateName: me.name,
    candidateEmail: me.email,
    techArea: body.techArea,
    coachName: body.coachName,
    startsAt: body.startsAt,
    amountInr: body.amountInr,
    approvalUrl,
    coachTimezone: body.coachTimezone,
  });
  try {
    await sendMail({
      to: coachEmail,
      subject: coachMail.subject,
      html: coachMail.html,
      text: coachMail.text,
    });
  } catch {
    // Booking is already confirmed in DB; don't fail user flow for email issues.
  }

  const candidateMail = coachingRequestEmailToCandidate({
    bookingId: created.id,
    candidateName: me.name,
    candidateEmail: me.email,
    techArea: body.techArea,
    coachName: body.coachName,
    startsAt: body.startsAt,
    amountInr: body.amountInr,
    approvalUrl,
    coachTimezone: body.coachTimezone,
  });
  try {
    await sendMail({
      to: candidateEmail,
      subject: candidateMail.subject,
      html: candidateMail.html,
      text: candidateMail.text,
    });
  } catch {
    // Non-blocking email failure.
  }

  const shouldSendAdminMail =
    Boolean(adminEmail) &&
    adminEmail !== coachEmail &&
    adminEmail !== candidateEmail;

  if (shouldSendAdminMail) {
    const adminMail = coachingRequestEmailToAdmin({
      bookingId: created.id,
      candidateName: me.name,
      candidateEmail: me.email,
      techArea: body.techArea,
      coachName: body.coachName,
      startsAt: body.startsAt,
      amountInr: body.amountInr,
      approvalUrl,
      coachTimezone: body.coachTimezone,
    });
    try {
      await sendMail({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
        text: adminMail.text,
      });
    } catch {
      // Non-blocking email failure.
    }
  }

  return ok({ booking: created }, 201);
}
