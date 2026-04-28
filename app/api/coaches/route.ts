import "server-only";

import { ok } from "@/lib/api/response";
import { findUserByEmail } from "@/lib/auth/verification-service";
import { listCoaches } from "@/lib/server/coaches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const coaches = await listCoaches({ activeOnly: true });
  const visibilityChecks = await Promise.all(
    coaches.map(async (coach) => {
      const user = await findUserByEmail(coach.email);
      const visible =
        user?.emailVerified === true &&
        (user.role === "coach" || user.role === "admin" || user.role === "super_admin");
      return { coach, visible };
    }),
  );
  return ok({
    coaches: visibilityChecks.filter((row) => row.visible).map((row) => row.coach),
  });
}
