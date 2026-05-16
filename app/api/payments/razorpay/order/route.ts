import "server-only";

import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { suspendResponseIfNeeded } from "@/lib/auth/account-status";
import { findUserById } from "@/lib/auth/verification-service";
import { getRazorpayClient, publicRazorpayKeyId } from "@/lib/payments/razorpay";
import { getAdminSettings } from "@/lib/admin-settings";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";
import {
  acquireCoachingSlotHold,
  verifyActiveCoachingSlotHold,
} from "@/lib/server/coaching-slot-holds";

export const runtime = "nodejs";

const Body = z.object({
  productType: z.enum(["interview", "coaching"]),
  amountInr: z.number().int().positive(),
  referenceId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);
  const suspended = suspendResponseIfNeeded(user);
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
  const payload = parsed.data;

  if (payload.productType === "coaching") {
    const coachId =
      typeof payload.metadata?.coachId === "string" ? payload.metadata.coachId.trim() : "";
    const startsAtRaw =
      typeof payload.metadata?.startsAt === "string" ? payload.metadata.startsAt.trim() : "";
    if (!coachId || !startsAtRaw || Number.isNaN(Date.parse(startsAtRaw))) {
      return fail(
        "validation_error",
        "Coaching checkout requires coachId and startsAt in metadata.",
        400,
      );
    }
    const startsAt = new Date(startsAtRaw);
    if (startsAt.getTime() <= Date.now()) {
      return fail("validation_error", "Please select a future slot.", 400);
    }
    const holdCheck = await verifyActiveCoachingSlotHold(user.id, coachId, startsAt);
    if (holdCheck === "booked") {
      return fail("validation_error", "This slot is no longer available.", 409);
    }
    if (holdCheck === "held_by_other") {
      return fail(
        "validation_error",
        "Another candidate is reserving this slot. Pick another time.",
        409,
      );
    }
    if (holdCheck === "missing") {
      const acquired = await acquireCoachingSlotHold(user.id, coachId, startsAt);
      if (!acquired.ok) {
        const message =
          acquired.reason === "booked"
            ? "This slot is no longer available."
            : "Another candidate is reserving this slot. Pick another time.";
        return fail("validation_error", message, 409);
      }
    } else {
      await acquireCoachingSlotHold(user.id, coachId, startsAt);
    }
  }

  const amountInr =
    payload.productType === "interview"
      ? (await getAdminSettings()).pricePerInterviewInr ?? INTERVIEW_PRICE_INR
      : payload.amountInr;

  if (
    payload.productType === "interview" &&
    payload.amountInr !== amountInr
  ) {
    return fail(
      "validation_error",
      `Interview price is ₹${amountInr}. Refresh the page and try again.`,
      400,
    );
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: amountInr * 100,
      currency: "INR",
      receipt: `sw-${Date.now()}`,
      notes: {
        paymentMode: "one_time",
        productType: payload.productType,
        userId: user.id,
        referenceId: payload.referenceId ?? "",
      },
    });

    const [tx] = await db
      .insert(schema.paymentTransactions)
      .values({
        userId: user.id,
        productType: payload.productType,
        referenceId: payload.referenceId ?? null,
        amountInr,
        status: "created",
        razorpayOrderId: order.id,
        metadata: (payload.metadata ?? {}) as Record<string, unknown>,
      })
      .returning({
        id: schema.paymentTransactions.id,
      });

    return ok({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      transactionId: tx?.id ?? null,
      razorpayKeyId: publicRazorpayKeyId(),
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("[payments/razorpay/order]", err);
    return fail("internal_error", "Failed to create Razorpay order.", 500);
  }
}
