import "server-only";

import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { suspendResponseIfNeeded } from "@/lib/auth/account-status";
import { findUserById } from "@/lib/auth/verification-service";
import { getRazorpayClient, publicRazorpayKeyId } from "@/lib/payments/razorpay";

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

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: payload.amountInr * 100,
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
        amountInr: payload.amountInr,
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
