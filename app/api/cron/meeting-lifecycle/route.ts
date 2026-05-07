import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { tryDeleteLiveKitRoom } from "@/lib/meeting/livekit-admin";
import { meetingStaleActiveGraceMin } from "@/lib/meeting/livekit-room-policy";

export const runtime = "nodejs";

function isAuthorized(req: Request) {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const headerToken =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return headerToken === secret;
}

/**
 * Closes meetings left `active` after scheduled end + grace (crash / disconnect / missing webhooks).
 * Optionally tears down the LiveKit room if a name is stored.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return fail("invalid_credentials", "Unauthorized cron request.", 401);
  }

  const graceMin = meetingStaleActiveGraceMin();
  const stale = await db
    .select({
      id: schema.coachingBookings.id,
      meetingRoomName: schema.coachingBookings.meetingRoomName,
    })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.meetingStatus, "active"),
        lt(
          sql`${schema.coachingBookings.startsAt} + (${schema.coachingBookings.durationMin} + ${graceMin}) * interval '1 minute'`,
          new Date(),
        ),
      ),
    );

  const now = new Date();
  let closed = 0;
  for (const row of stale) {
    await db
      .update(schema.coachingBookings)
      .set({
        meetingStatus: "ended",
        meetingEndedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.coachingBookings.id, row.id));
    await tryDeleteLiveKitRoom(row.meetingRoomName);
    closed += 1;
  }

  return ok({ staleMeetingsClosed: closed });
}
