import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "validation_error"
  | "email_already_registered"
  | "coach_already_exists"
  | "invalid_credentials"
  | "email_not_verified"
  | "invalid_or_expired_token"
  | "user_not_found"
  | "rate_limited"
  | "internal_error";

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { ok: false, code, message, ...(extra ?? {}) },
    { status },
  );
}
