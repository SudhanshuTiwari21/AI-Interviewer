"use client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  emailVerified?: boolean;
};

export type ApiResult<T extends Record<string, unknown> = Record<string, unknown>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      code:
        | "validation_error"
        | "email_already_registered"
        | "invalid_credentials"
        | "email_not_verified"
        | "invalid_or_expired_token"
        | "user_not_found"
        | "rate_limited"
        | "internal_error";
      message: string;
      [extra: string]: unknown;
    };

async function postJson<T extends Record<string, unknown>>(
  url: string,
  body: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      credentials: "same-origin",
    });
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      ok: false,
      code: "internal_error",
      message: "Network error. Please try again.",
    };
  }
}

export const authClient = {
  signup(input: {
    name: string;
    email: string;
    password: string;
    leadSource?: string;
  }) {
    return postJson<{
      status: "verification_sent" | "verification_resent";
      message: string;
      email: string;
    }>("/api/auth/signup", input);
  },
  login(input: { email: string; password: string }) {
    return postJson<{ user: AuthUser }>("/api/auth/login", input);
  },
  logout() {
    return postJson<{ status: "logged_out" }>("/api/auth/logout", {});
  },
  verifyEmail(token: string) {
    return postJson<{ status: "verified"; user: AuthUser }>(
      "/api/auth/verify-email",
      { token },
    );
  },
  resendVerification(email: string) {
    return postJson<{ status: "sent"; message: string }>(
      "/api/auth/resend-verification",
      { email },
    );
  },
  async me(): Promise<AuthUser | null> {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json()) as { ok: boolean; user: AuthUser | null };
      return data.user ?? null;
    } catch {
      return null;
    }
  },
};
