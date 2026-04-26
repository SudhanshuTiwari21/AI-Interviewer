import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db/client";
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

  if (!existing) {
    return fail(
      "validation_error",
      "This email is not registered yet. Ask this user to sign up first, then promote from team management.",
      400,
    );
  }

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

  return ok(
    {
      user: { id: existing.id, email, role },
      status: "promoted",
      requiresEmailVerification: !existing.emailVerified,
    },
    200,
  );
}
