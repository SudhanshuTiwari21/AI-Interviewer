import "server-only";

import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { issuePasswordResetEmail } from "@/lib/auth/password-reset-service";

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

  try {
    await issuePasswordResetEmail(parsed.data.email);
    return ok({
      status: "sent",
      message:
        "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (err) {
    console.error("[auth/forgot-password]", err);
    return fail(
      "internal_error",
      "Could not process password reset right now. Please try again.",
      500,
    );
  }
}
