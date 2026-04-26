import "server-only";

import { fail } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import type { UserRow } from "@/lib/db/schema";

export type RequireCoachResult =
  | { ok: true; user: UserRow }
  | { ok: false; response: Response };

export async function requireCoach(): Promise<RequireCoachResult> {
  const session = await getSessionFromCookie();
  if (!session)
    return {
      ok: false,
      response: fail("invalid_credentials", "Please sign in first.", 401),
    };
  const user = await findUserById(session.sub);
  if (!user || !user.emailVerified || user.status === "suspended") {
    return {
      ok: false,
      response: fail("invalid_credentials", "Please sign in first.", 401),
    };
  }
  if (user.role !== "coach") {
    return {
      ok: false,
      response: fail("validation_error", "Only coaches can access this route.", 403),
    };
  }
  return { ok: true, user };
}
