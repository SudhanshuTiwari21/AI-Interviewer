import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

/** ISO start times for a coach that are already held (any candidate), excluding cancelled/rejected. */
export async function GET(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me?.emailVerified) return fail("invalid_credentials", "Please sign in first.", 401);

  const coachId = new URL(req.url).searchParams.get("coachId")?.trim();
  if (!coachId) return fail("validation_error", "coachId is required.", 400);

  const rows = await db
    .select({ startsAt: schema.coachingBookings.startsAt })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, coachId),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    );

  return ok({ slots: rows.map((r) => r.startsAt.toISOString()) });
}
