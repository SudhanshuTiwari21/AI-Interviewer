import "server-only";

import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { COACHING_SLOT_HOLD_MINUTES } from "@/lib/coaching/constants";

function holdExpiresAt(from = Date.now()) {
  return new Date(from + COACHING_SLOT_HOLD_MINUTES * 60 * 1000);
}

export async function purgeExpiredCoachingSlotHolds() {
  await db
    .delete(schema.coachingSlotHolds)
    .where(lt(schema.coachingSlotHolds.expiresAt, new Date()));
}

async function isCoachSlotBooked(coachId: string, startsAt: Date) {
  const rows = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, coachId),
        eq(schema.coachingBookings.startsAt, startsAt),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

/** Start times unavailable to `viewerUserId` (bookings + other users' active holds). */
export async function listCoachOccupiedSlotStarts(
  coachId: string,
  viewerUserId?: string,
): Promise<string[]> {
  await purgeExpiredCoachingSlotHolds();

  const bookingRows = await db
    .select({ startsAt: schema.coachingBookings.startsAt })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, coachId),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    );

  const holdWhere = viewerUserId
    ? and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        gt(schema.coachingSlotHolds.expiresAt, new Date()),
        sql`${schema.coachingSlotHolds.userId} <> ${viewerUserId}`,
      )
    : and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        gt(schema.coachingSlotHolds.expiresAt, new Date()),
      );

  const holdRows = await db
    .select({ startsAt: schema.coachingSlotHolds.startsAt })
    .from(schema.coachingSlotHolds)
    .where(holdWhere);

  const isoSet = new Set<string>();
  for (const row of bookingRows) isoSet.add(row.startsAt.toISOString());
  for (const row of holdRows) isoSet.add(row.startsAt.toISOString());
  return [...isoSet];
}

export type AcquireSlotHoldResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: "booked" | "held_by_other" };

export async function acquireCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<AcquireSlotHoldResult> {
  if (startsAt.getTime() <= Date.now()) {
    return { ok: false, reason: "booked" };
  }

  await purgeExpiredCoachingSlotHolds();

  if (await isCoachSlotBooked(coachId, startsAt)) {
    return { ok: false, reason: "booked" };
  }

  const expiresAt = holdExpiresAt();
  const existing = await db
    .select()
    .from(schema.coachingSlotHolds)
    .where(
      and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        eq(schema.coachingSlotHolds.startsAt, startsAt),
      ),
    )
    .limit(1);

  const row = existing[0];
  if (row) {
    if (row.expiresAt > new Date() && row.userId !== userId) {
      return { ok: false, reason: "held_by_other" };
    }
    await db
      .update(schema.coachingSlotHolds)
      .set({ userId, expiresAt, updatedAt: new Date() })
      .where(eq(schema.coachingSlotHolds.id, row.id));
    return { ok: true, expiresAt: expiresAt.toISOString() };
  }

  try {
    await db.insert(schema.coachingSlotHolds).values({
      coachId,
      startsAt,
      userId,
      expiresAt,
    });
    return { ok: true, expiresAt: expiresAt.toISOString() };
  } catch {
    const retry = await db
      .select()
      .from(schema.coachingSlotHolds)
      .where(
        and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          eq(schema.coachingSlotHolds.startsAt, startsAt),
        ),
      )
      .limit(1);
    const again = retry[0];
    if (!again) return { ok: false, reason: "held_by_other" };
    if (again.expiresAt <= new Date() || again.userId === userId) {
      const nextExpires = holdExpiresAt();
      await db
        .update(schema.coachingSlotHolds)
        .set({ userId, expiresAt: nextExpires, updatedAt: new Date() })
        .where(eq(schema.coachingSlotHolds.id, again.id));
      return { ok: true, expiresAt: nextExpires.toISOString() };
    }
    return { ok: false, reason: "held_by_other" };
  }
}

export async function releaseCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
) {
  await db
    .delete(schema.coachingSlotHolds)
    .where(
      and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        eq(schema.coachingSlotHolds.startsAt, startsAt),
        eq(schema.coachingSlotHolds.userId, userId),
      ),
    );
}

export async function releaseAllCoachingSlotHoldsForUser(userId: string) {
  await db
    .delete(schema.coachingSlotHolds)
    .where(eq(schema.coachingSlotHolds.userId, userId));
}

/** Active hold owned by this user (required before starting payment). */
export async function verifyActiveCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<"ok" | "booked" | "missing" | "held_by_other"> {
  if (await isCoachSlotBooked(coachId, startsAt)) return "booked";

  await purgeExpiredCoachingSlotHolds();

  const rows = await db
    .select()
    .from(schema.coachingSlotHolds)
    .where(
      and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        eq(schema.coachingSlotHolds.startsAt, startsAt),
      ),
    )
    .limit(1);

  const hold = rows[0];
  if (!hold || hold.expiresAt <= new Date()) return "missing";
  if (hold.userId !== userId) return "held_by_other";
  return "ok";
}

/** Final booking guard after payment (hold may have expired during checkout). */
export async function canFinalizeCoachingSlotBooking(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<"ok" | "booked" | "held_by_other"> {
  if (await isCoachSlotBooked(coachId, startsAt)) return "booked";

  await purgeExpiredCoachingSlotHolds();

  const rows = await db
    .select()
    .from(schema.coachingSlotHolds)
    .where(
      and(
        eq(schema.coachingSlotHolds.coachId, coachId),
        eq(schema.coachingSlotHolds.startsAt, startsAt),
        gt(schema.coachingSlotHolds.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const hold = rows[0];
  if (hold && hold.userId !== userId) return "held_by_other";
  return "ok";
}
