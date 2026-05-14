import "server-only";

import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return ok({ user: null });
  }

  const user = await findUserById(session.sub);
  if (!user || !user.emailVerified) {
    return ok({ user: null });
  }

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      emailVerified: user.emailVerified,
      status: user.status === "suspended" ? "suspended" : "active",
    },
  });
}
