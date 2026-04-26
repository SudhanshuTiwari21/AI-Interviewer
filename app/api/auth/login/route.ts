import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/verification-service";
import { fail, ok } from "@/lib/api/response";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

async function loginWithEnvSuperAdmin(email: string, password: string) {
  const envEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.SUPER_ADMIN_PASSWORD;
  const envName = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";
  if (!envEmail || !envPassword) return null;
  if (email !== envEmail || password !== envPassword) return null;

  const existing = await findUserByEmail(envEmail);
  const passwordHash = await hashPassword(envPassword);
  if (existing) {
    await db
      .update(schema.users)
      .set({
        name: envName,
        role: "super_admin",
        status: "active",
        emailVerified: true,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id));

    return {
      id: existing.id,
      email: envEmail,
      name: envName,
      role: "super_admin",
      plan: existing.plan ?? "free",
    };
  }

  const [created] = await db
    .insert(schema.users)
    .values({
      email: envEmail,
      name: envName,
      passwordHash,
      role: "super_admin",
      status: "active",
      emailVerified: true,
      emailVerifiedAt: new Date(),
      plan: "free",
      leadSource: "internal",
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      plan: schema.users.plan,
    });
  return created ?? null;
}

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
    const envSuperAdmin = await loginWithEnvSuperAdmin(email, password);
    if (envSuperAdmin) {
      await setSessionCookie({
        sub: envSuperAdmin.id,
        email: envSuperAdmin.email,
        name: envSuperAdmin.name,
        role: envSuperAdmin.role,
        plan: envSuperAdmin.plan,
      });

      return ok({
        user: {
          id: envSuperAdmin.id,
          email: envSuperAdmin.email,
          name: envSuperAdmin.name,
          role: envSuperAdmin.role,
          plan: envSuperAdmin.plan,
        },
      });
    }

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
