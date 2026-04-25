import "server-only";

import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/verification-service";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
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

  const { email, password } = parsed.data;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return fail(
        "invalid_credentials",
        "Email or password is incorrect.",
        401,
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return fail(
        "invalid_credentials",
        "Email or password is incorrect.",
        401,
      );
    }

    if (!user.emailVerified) {
      return fail(
        "email_not_verified",
        "Your email isn't verified yet. Please check your inbox or request a new verification link.",
        403,
        { email: user.email },
      );
    }

    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    });

    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return fail(
      "internal_error",
      "Something went wrong signing you in. Please try again.",
      500,
    );
  }
}
