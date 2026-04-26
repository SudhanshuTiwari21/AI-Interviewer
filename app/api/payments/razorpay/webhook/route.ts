import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

type RazorpayWebhookPayload = {
  event?: string;
  created_at?: number;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number } };
    refund?: {
      entity?: { id?: string; payment_id?: string; amount?: number; status?: string };
    };
  };
};

function eventIdFromPayload(payload: RazorpayWebhookPayload) {
  const created = payload.created_at ?? Date.now();
  const paymentId = payload.payload?.payment?.entity?.id ?? "na";
  const refundId = payload.payload?.refund?.entity?.id ?? "na";
  return `${payload.event ?? "unknown"}:${created}:${paymentId}:${refundId}`;
}

async function markEvent(
  eventId: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
) {
  await db
    .update(schema.razorpayWebhookEvents)
    .set({
      processingStatus: status,
      processedAt: new Date(),
      errorMessage: errorMessage ?? null,
    })
    .where(eq(schema.razorpayWebhookEvents.eventId, eventId));
}

async function handlePaymentCaptured(payload: RazorpayWebhookPayload) {
  const payment = payload.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) return;

  const txRows = await db
    .select()
    .from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.razorpayOrderId, payment.order_id))
    .limit(1);
  const tx = txRows[0];
  if (!tx) return;

  await db
    .update(schema.paymentTransactions)
    .set({
      status: "paid",
      razorpayPaymentId: payment.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.paymentTransactions.id, tx.id));
}

async function handleRefundProcessed(payload: RazorpayWebhookPayload) {
  const refund = payload.payload?.refund?.entity;
  if (!refund?.payment_id) return;

  const txRows = await db
    .select()
    .from(schema.paymentTransactions)
    .where(eq(schema.paymentTransactions.razorpayPaymentId, refund.payment_id))
    .limit(1);
  const tx = txRows[0];
  if (!tx) return;

  const isProcessed = refund.status === "processed" || refund.status === "refunded";
  const isPartial =
    isProcessed &&
    typeof refund.amount === "number" &&
    refund.amount < tx.amountInr * 100;
  const refundStatus = isProcessed
    ? isPartial
      ? "partially_refunded"
      : "refunded"
    : "refund_pending";
  await db
    .update(schema.paymentTransactions)
    .set({
      status: refundStatus,
      updatedAt: new Date(),
      metadata: {
        ...(tx.metadata as Record<string, unknown>),
        latestRefund: refund,
      },
    })
    .where(eq(schema.paymentTransactions.id, tx.id));

  if (tx.productType === "coaching") {
    const bookings = await db
      .select({
        id: schema.coachingBookings.id,
      })
      .from(schema.coachingBookings)
      .where(
        and(
          eq(schema.coachingBookings.paymentTransactionId, tx.id),
          eq(schema.coachingBookings.razorpayPaymentId, refund.payment_id),
        ),
      )
      .limit(1);
    const booking = bookings[0];
    if (!booking) return;
    await db
      .update(schema.coachingBookings)
      .set({
        paymentStatus: refundStatus,
        status: refundStatus,
        razorpayRefundId: refund.id ?? null,
        refundProcessedAt:
          refundStatus === "refunded" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.coachingBookings.paymentTransactionId, tx.id),
          eq(schema.coachingBookings.razorpayPaymentId, refund.payment_id),
        ),
      );
    await db.insert(schema.refundEvents).values({
      bookingId: booking.id,
      eventType: "webhook_update",
      actorEmail: "razorpay-webhook",
      actorRole: "system",
      note: `Webhook ${payload.event ?? "refund.update"} received`,
      amountInr:
        typeof refund.amount === "number"
          ? Math.round(refund.amount / 100)
          : null,
      metadata: refund as Record<string, unknown>,
    });
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return fail("validation_error", "Missing X-Razorpay-Signature header.", 400);
  }

  const rawBody = await req.text();
  const isValid = verifyRazorpayWebhookSignature({
    body: rawBody,
    signature,
  });
  if (!isValid) {
    return fail("validation_error", "Invalid webhook signature.", 401);
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return fail("validation_error", "Invalid webhook payload JSON.", 400);
  }
  const eventType = payload.event ?? "unknown";
  const eventId = eventIdFromPayload(payload);

  const inserted = await db
    .insert(schema.razorpayWebhookEvents)
    .values({
      eventId,
      eventType,
      payload: payload as Record<string, unknown>,
      processingStatus: "received",
    })
    .onConflictDoNothing({ target: schema.razorpayWebhookEvents.eventId })
    .returning({ id: schema.razorpayWebhookEvents.id });

  if (inserted.length === 0) {
    return ok({ received: true, duplicate: true, eventId });
  }

  try {
    if (eventType === "payment.captured") {
      await handlePaymentCaptured(payload);
      await markEvent(eventId, "processed");
      return ok({ received: true, processed: true, eventType, eventId });
    }
    if (eventType === "refund.processed" || eventType === "refund.created") {
      await handleRefundProcessed(payload);
      await markEvent(eventId, "processed");
      return ok({ received: true, processed: true, eventType, eventId });
    }
    await markEvent(eventId, "ignored");
    return ok({ received: true, ignored: true, eventType, eventId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown webhook error";
    await markEvent(eventId, "failed", message);
    console.error("[payments/razorpay/webhook]", err);
    return fail("internal_error", "Webhook processing failed.", 500);
  }
}
