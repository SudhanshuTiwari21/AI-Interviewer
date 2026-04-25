import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { hashToken } from "@/lib/auth/tokens";
import { setSessionCookie } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(8, "Verification token is required"),
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
      parsed.error.issues[0]?.message ?? "Invalid token",
      400,
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();

  try {
    const tokenRows = await db
      .select()
      .from(schema.emailVerificationTokens)
      .where(
        and(
          eq(schema.emailVerificationTokens.tokenHash, tokenHash),
          isNull(schema.emailVerificationTokens.consumedAt),
          gt(schema.emailVerificationTokens.expiresAt, now),
        ),
      )
      .limit(1);

    const tokenRow = tokenRows[0];
    if (!tokenRow) {
      return fail(
        "invalid_or_expired_token",
        "This verification link is invalid or has expired. Please request a new one.",
        400,
      );
    }

    const userRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, tokenRow.userId))
      .limit(1);
    const user = userRows[0];

    if (!user) {
      return fail("user_not_found", "Account no longer exists.", 404);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.emailVerificationTokens)
        .set({ consumedAt: now })
        .where(eq(schema.emailVerificationTokens.id, tokenRow.id));

      if (!user.emailVerified) {
        await tx
          .update(schema.users)
          .set({
            emailVerified: true,
            emailVerifiedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.users.id, user.id));
      }
    });

    await setSessionCookie({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    });

    return ok({
      status: "verified",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("[auth/verify-email]", err);
    return fail(
      "internal_error",
      "Could not verify your email. Please try again.",
      500,
    );
  }
}
