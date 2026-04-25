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

  // Always respond 200 with the same message to avoid disclosing
  // whether an email is registered. We only actually send if the
  // account exists and is not already verified.
  const genericMessage =
    "If an account exists for that email and isn't verified yet, we've just sent a fresh verification link.";

  try {
    const user = await findUserByEmail(email);
    if (user && !user.emailVerified) {
      await issueVerificationEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    }

    return ok({ status: "sent", message: genericMessage });
  } catch (err) {
    console.error("[auth/resend-verification]", err);
    return fail(
      "internal_error",
      "Could not send verification email. Please try again.",
      500,
    );
  }
}
