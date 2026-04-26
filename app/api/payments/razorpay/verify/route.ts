import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

const Body = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  transactionId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

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

  const valid = verifyRazorpaySignature({
    orderId: body.razorpayOrderId,
    paymentId: body.razorpayPaymentId,
    signature: body.razorpaySignature,
  });
  if (valid !== true) {
    return fail("validation_error", "Payment signature verification failed.", 400);
  }

  const where = body.transactionId
    ? and(
        eq(schema.paymentTransactions.id, body.transactionId),
        eq(schema.paymentTransactions.userId, user.id),
      )
    : and(
        eq(schema.paymentTransactions.razorpayOrderId, body.razorpayOrderId),
        eq(schema.paymentTransactions.userId, user.id),
      );

  const rows = await db
    .select()
    .from(schema.paymentTransactions)
    .where(where)
    .limit(1);
  const tx = rows[0];
  if (!tx) return fail("user_not_found", "Payment transaction not found.", 404);

  await db
    .update(schema.paymentTransactions)
    .set({
      status: "paid",
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      updatedAt: new Date(),
    })
    .where(eq(schema.paymentTransactions.id, tx.id));

  return ok({
    verified: true,
    transaction: {
      id: tx.id,
      productType: tx.productType,
      amountInr: tx.amountInr,
      referenceId: tx.referenceId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
    },
  });
}
