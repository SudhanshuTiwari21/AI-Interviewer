import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { ok } from "@/lib/api/response";
import { requireCoach } from "@/lib/auth/coach";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;
  const coach = auth.user;

  const coachRows = await db
    .select({ id: schema.coaches.id, email: schema.coaches.email })
    .from(schema.coaches)
    .where(eq(schema.coaches.email, coach.email))
    .limit(20);
  const coachIds = coachRows.map((x) => x.id);
  if (coachIds.length === 0) return ok({ bookings: [] });

  const rows = await db
    .select()
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachEmail, coach.email),
        inArray(schema.coachingBookings.coachId, coachIds),
      ),
    )
    .orderBy(desc(schema.coachingBookings.createdAt))
    .limit(200);
  return ok({ bookings: rows });
}
