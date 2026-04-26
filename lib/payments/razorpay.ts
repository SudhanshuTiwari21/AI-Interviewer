import "server-only";

import crypto from "node:crypto";
import Razorpay from "razorpay";

function getKeyId() {
  const v = process.env.RAZORPAY_KEY_ID;
  if (!v) throw new Error("RAZORPAY_KEY_ID is missing.");
  return v;
}

function getKeySecret() {
  const v = process.env.RAZORPAY_KEY_SECRET;
  if (!v) throw new Error("RAZORPAY_KEY_SECRET is missing.");
  return v;
}

function getWebhookSecret() {
  const v = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!v) throw new Error("RAZORPAY_WEBHOOK_SECRET is missing.");
  return v;
}

export function getRazorpayClient() {
  return new Razorpay({
    key_id: getKeyId(),
    key_secret: getKeySecret(),
  });
}

export function verifyRazorpaySignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const payload = `${args.orderId}|${args.paymentId}`;
  const expected = crypto
    .createHmac("sha256", getKeySecret())
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(args.signature),
  );
}

export function verifyRazorpayWebhookSignature(args: {
  body: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", getWebhookSecret())
    .update(args.body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(args.signature),
  );
}

export function publicRazorpayKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}
