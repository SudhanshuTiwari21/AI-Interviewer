import "server-only";

import { z } from "zod";
import {
  findUserByEmail,
  issueVerificationEmail,
} from "@/lib/auth/verification-service";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
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

  const { email } = parsed.data;

  const unknownEmailMessage =
    "If an account exists for that email and isn't verified yet, we've just sent a fresh verification link.";

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return ok({ status: "noop", message: unknownEmailMessage });
    }
    if (user.emailVerified) {
      return ok({
        status: "already_verified",
        message: "This account is already verified. You can sign in with your email and password.",
      });
    }

    await issueVerificationEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return ok({
      status: "sent",
      message:
        "We've sent a fresh verification link to your inbox. Check your email (and spam folder).",
    });
  } catch (err) {
    console.error("[auth/resend-verification]", err);
    return fail(
      "internal_error",
      "Could not send verification email. Please try again.",
      500,
    );
  }
}
