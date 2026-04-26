import "server-only";

import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import {
  hasPermission,
  isAdminRole,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import { fail } from "@/lib/api/response";
import type { UserRow } from "@/lib/db/schema";

export type AdminContext = {
  user: UserRow;
  role: Role;
};

/**
 * Resolves the current admin user from the session cookie. The role is read
 * from the freshest DB row (not the JWT) so role changes take effect right
 * away without forcing a re-login.
 */
export async function getAdminFromSession(): Promise<AdminContext | null> {
  const session = await getSessionFromCookie();
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user?.emailVerified) return null;
  if (user.status === "suspended") return null;
  if (!isAdminRole(user.role)) return null;
  return { user, role: user.role as Role };
}

/**
 * Returns either an `AdminContext` or a NextResponse error if the request
 * is unauthorized / forbidden. Use this at the top of every admin API route.
 *
 *   const ctx = await requirePermission(req, "users.update");
 *   if (ctx instanceof NextResponse) return ctx;
 */
export async function requirePermission(
  permission: Permission,
): Promise<AdminContext | NextResponse> {
  const ctx = await getAdminFromSession();
  if (!ctx) {
    return fail("invalid_credentials", "Sign in as an admin to continue.", 401);
  }
  if (!hasPermission(ctx.role, permission)) {
    return fail(
      "validation_error",
      "You do not have permission to perform this action.",
      403,
    );
  }
  return ctx;
}
