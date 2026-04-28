import "server-only";

import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

export function generateVerificationToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildVerificationUrl(token: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildPasswordResetUrl(token: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export function verificationTokenTtlMs(): number {
  const hours = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? 24);
  return hours * 60 * 60 * 1000;
}

export function passwordResetTokenTtlMs(): number {
  const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30);
  return minutes * 60 * 1000;
}
