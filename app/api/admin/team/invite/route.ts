import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { canAssignRole, type Role } from "@/lib/auth/permissions";
import { findUserByEmail, issueVerificationEmail } from "@/lib/auth/verification-service";
import { recordAudit } from "@/lib/audit";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["super_admin", "admin", "sub_admin"]),
});

/**
 * Creates an admin teammate. If the email already exists we just promote
 * (and re-send a verification email if needed). Otherwise a fresh row is
 * created with a random password — the invitee verifies via email and then
 * resets it through the normal flow.
 */
export async function POST(req: Request) {
  const ctx = await requirePermission("team.invite");
  if (ctx instanceof NextResponse) return ctx;

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

  const { name, email, role } = parsed.data;

  if (!canAssignRole(ctx.role, role as Role)) {
    return fail(
      "validation_error",
      "You do not have permission to assign that role.",
      403,
    );
  }

  const existing = await findUserByEmail(email);

  if (existing) {
    await db
      .update(schema.users)
      .set({ role, name, updatedAt: new Date() })
      .where(eq(schema.users.id, existing.id));

    if (!existing.emailVerified) {
      await issueVerificationEmail({ userId: existing.id, email: existing.email, name });
    }

    await recordAudit(ctx, {
      action: "team.promote",
      targetType: "user",
      targetId: existing.id,
      metadata: { role, previousRole: existing.role },
    });

    return ok({ user: { id: existing.id, email, role }, status: "promoted" }, 200);
  }

  const tempPassword =
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10).toUpperCase() +
    "!";
  const passwordHash = await hashPassword(tempPassword);

  const [created] = await db
    .insert(schema.users)
    .values({
      email,
      name,
      role,
      passwordHash,
    })
    .returning({ id: schema.users.id, email: schema.users.email });

  if (!created) {
    return fail("internal_error", "Could not create teammate.", 500);
  }

  await issueVerificationEmail({
    userId: created.id,
    email: created.email,
    name,
  });

  await recordAudit(ctx, {
    action: "team.invite",
    targetType: "user",
    targetId: created.id,
    metadata: { role, email: created.email },
  });

  return ok({ user: { id: created.id, email, role }, status: "invited" }, 201);
}
