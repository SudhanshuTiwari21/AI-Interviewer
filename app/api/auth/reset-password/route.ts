import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema, PASSWORD_MAX_LENGTH } from "@/lib/auth/password-policy";
import {
  consumePasswordResetToken,
  invalidateOtherPasswordResetTokens,
} from "@/lib/auth/password-reset-service";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

const Body = z
  .object({
    token: z.string().trim().min(20, "Invalid or expired reset link."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password").max(PASSWORD_MAX_LENGTH),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
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
    const consumed = await consumePasswordResetToken(parsed.data.token);
    if (!consumed) {
      return fail(
        "invalid_or_expired_token",
        "This reset link is invalid or expired. Please request a new one.",
        400,
      );
    }

    const nextHash = await hashPassword(parsed.data.password);
    await db
      .update(schema.users)
      .set({
        passwordHash: nextHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, consumed.userId));

    await invalidateOtherPasswordResetTokens(consumed.userId);

    return ok({
      status: "reset",
      message: "Password updated successfully. You can sign in now.",
    });
  } catch (err) {
    console.error("[auth/reset-password]", err);
    return fail(
      "internal_error",
      "Could not reset password right now. Please try again.",
      500,
    );
  }
}
