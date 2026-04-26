import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me) return fail("invalid_credentials", "Please sign in first.", 401);

  const url = new URL(req.url);
  const bookingIds = (url.searchParams.get("bookingIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  const isAdmin =
    me.role === "admin" || me.role === "super_admin" || me.role === "sub_admin";

  if (bookingIds.length === 0) return ok({ events: [] });

  if (isAdmin) {
    const events = await db
      .select()
      .from(schema.refundEvents)
      .where(inArray(schema.refundEvents.bookingId, bookingIds))
      .orderBy(desc(schema.refundEvents.createdAt))
      .limit(500);
    return ok({ events });
  }

  const userBookings = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.candidateUserId, me.id))
    .limit(500);
  const allowed = new Set(userBookings.map((x) => x.id));
  const filteredIds = bookingIds.filter((id) => allowed.has(id));
  if (filteredIds.length === 0) return ok({ events: [] });

  const events = await db
    .select()
    .from(schema.refundEvents)
    .where(inArray(schema.refundEvents.bookingId, filteredIds))
    .orderBy(desc(schema.refundEvents.createdAt))
    .limit(500);
  return ok({ events });
}
