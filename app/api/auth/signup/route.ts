import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import {
  findUserByEmail,
  issueVerificationEmail,
} from "@/lib/auth/verification-service";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  leadSource: z.string().trim().max(80).optional().default("direct"),
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
      { issues: parsed.error.issues },
    );
  }

  const { name, email, password, leadSource } = parsed.data;

  try {
    const existing = await findUserByEmail(email);

    // Edge case: same email re-used while still unverified.
    // We refresh credentials/name and re-send a verification email
    // instead of blocking the user with "already registered".
    if (existing && !existing.emailVerified) {
      const passwordHash = await hashPassword(password);
      await db
        .update(schema.users)
        .set({
          name,
          passwordHash,
          leadSource,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id));

      await issueVerificationEmail({
        userId: existing.id,
        email: existing.email,
        name,
      });

      return ok(
        {
          status: "verification_resent",
          message:
            "Account already pending verification. We just sent you a fresh verification link.",
          email: existing.email,
        },
        200,
      );
    }

    if (existing?.emailVerified) {
      return fail(
        "email_already_registered",
        "An account with this email already exists. Please sign in instead.",
        409,
      );
    }

    const passwordHash = await hashPassword(password);
    const [created] = await db
      .insert(schema.users)
      .values({
        email,
        name,
        passwordHash,
        leadSource,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
      });

    if (!created) {
      return fail("internal_error", "Could not create account", 500);
    }

    await issueVerificationEmail({
      userId: created.id,
      email: created.email,
      name: created.name,
    });

    return ok(
      {
        status: "verification_sent",
        message: "Account created. Check your inbox to verify your email.",
        email: created.email,
      },
      201,
    );
  } catch (err) {
    console.error("[auth/signup]", err);
    return fail(
      "internal_error",
      "Something went wrong creating your account. Please try again.",
      500,
    );
  }
}
