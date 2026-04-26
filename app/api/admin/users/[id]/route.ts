import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import {
  canActOnRole,
  canAssignRole,
  hasPermission,
  type Role,
} from "@/lib/auth/permissions";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["super_admin", "admin", "sub_admin", "user"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

async function loadTarget(id: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePermission("users.update");
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

  const target = await loadTarget(params.id);
  if (!target) return fail("user_not_found", "User not found.", 404);

  if (!canActOnRole(ctx.role, target.role as Role) && target.id !== ctx.user.id) {
    return fail("validation_error", "You cannot modify this user.", 403);
  }

  const updates: Partial<typeof schema.users.$inferInsert> = {
    updatedAt: new Date(),
  };

  // Role assignment
  if (parsed.data.role && parsed.data.role !== target.role) {
    if (!canAssignRole(ctx.role, parsed.data.role)) {
      return fail(
        "validation_error",
        "You do not have permission to assign that role.",
        403,
      );
    }
    if (target.id === ctx.user.id) {
      return fail("validation_error", "You cannot change your own role.", 400);
    }
    updates.role = parsed.data.role;
  }

  // Suspend / reactivate
  if (parsed.data.status && parsed.data.status !== target.status) {
    if (!hasPermission(ctx.role, "users.suspend")) {
      return fail(
        "validation_error",
        "You do not have permission to change user status.",
        403,
      );
    }
    if (target.id === ctx.user.id) {
      return fail("validation_error", "You cannot suspend your own account.", 400);
    }
    updates.status = parsed.data.status;
    updates.suspendedAt = parsed.data.status === "suspended" ? new Date() : null;
  }

  if (parsed.data.name) updates.name = parsed.data.name;

  await db.update(schema.users).set(updates).where(eq(schema.users.id, target.id));

  await recordAudit(ctx, {
    action: "user.update",
    targetType: "user",
    targetId: target.id,
    metadata: { changes: parsed.data, previous: { role: target.role, status: target.status } },
  });

  const next = await loadTarget(target.id);
  return ok({ user: next });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePermission("users.delete");
  if (ctx instanceof NextResponse) return ctx;

  const target = await loadTarget(params.id);
  if (!target) return fail("user_not_found", "User not found.", 404);
  if (target.id === ctx.user.id) {
    return fail("validation_error", "You cannot delete your own account.", 400);
  }
  if (!canActOnRole(ctx.role, target.role as Role)) {
    return fail("validation_error", "You cannot delete this user.", 403);
  }

  await db.delete(schema.users).where(eq(schema.users.id, target.id));

  await recordAudit(ctx, {
    action: "user.delete",
    targetType: "user",
    targetId: target.id,
    metadata: { email: target.email, role: target.role },
  });

  return ok({ deleted: true });
}
