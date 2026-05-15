import "server-only";

import { and, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { COACHING_SLOT_HOLD_MINUTES } from "@/lib/coaching/constants";

function holdExpiresAt(from = Date.now()) {
  return new Date(from + COACHING_SLOT_HOLD_MINUTES * 60 * 1000);
}

function isMissingSlotHoldsTable(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "42P01") return true;
  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  return (
    message.includes("coaching_slot_holds") &&
    (message.includes("does not exist") || message.includes("undefined_table"))
  );
}

/** Align client/server slot instants (drop sub-second drift). */
export function normalizeCoachingSlotStart(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 1000) * 1000);
}

export async function purgeExpiredCoachingSlotHolds() {
  try {
    await db
      .delete(schema.coachingSlotHolds)
      .where(lt(schema.coachingSlotHolds.expiresAt, new Date()));
  } catch (error) {
    if (!isMissingSlotHoldsTable(error)) throw error;
  }
}

async function listActiveHoldStarts(
  coachId: string,
  viewerUserId?: string,
): Promise<string[]> {
  try {
    const holdWhere = viewerUserId
      ? and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          gt(schema.coachingSlotHolds.expiresAt, new Date()),
          ne(schema.coachingSlotHolds.userId, viewerUserId),
        )
      : and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          gt(schema.coachingSlotHolds.expiresAt, new Date()),
        );

    const holdRows = await db
      .select({ startsAt: schema.coachingSlotHolds.startsAt })
      .from(schema.coachingSlotHolds)
      .where(holdWhere);

    return holdRows.map((r) => r.startsAt.toISOString());
  } catch (error) {
    if (isMissingSlotHoldsTable(error)) return [];
    throw error;
  }
}

async function isCoachSlotBooked(coachId: string, startsAt: Date) {
  const slot = normalizeCoachingSlotStart(startsAt);
  const rows = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, coachId),
        eq(schema.coachingBookings.startsAt, slot),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function listBookedCoachSlotStarts(coachId: string): Promise<string[]> {
  const bookingRows = await db
    .select({ startsAt: schema.coachingBookings.startsAt })
    .from(schema.coachingBookings)
    .where(
      and(
        eq(schema.coachingBookings.coachId, coachId),
        sql`${schema.coachingBookings.status} NOT IN ('cancelled', 'rejected')`,
      ),
    );
  return bookingRows.map((row) => row.startsAt.toISOString());
}

/** Start times unavailable to `viewerUserId` (bookings + other users' active holds). */
export async function listCoachOccupiedSlotStarts(
  coachId: string,
  viewerUserId?: string,
): Promise<string[]> {
  try {
    await purgeExpiredCoachingSlotHolds();

    const isoSet = new Set<string>();
    for (const iso of await listBookedCoachSlotStarts(coachId)) isoSet.add(iso);
    for (const iso of await listActiveHoldStarts(coachId, viewerUserId)) isoSet.add(iso);
    return [...isoSet];
  } catch (error) {
    if (isMissingSlotHoldsTable(error)) {
      return listBookedCoachSlotStarts(coachId);
    }
    throw error;
  }
}

export type AcquireSlotHoldResult =
  | { ok: true; expiresAt: string }
  | { ok: false; reason: "booked" | "held_by_other" };

export async function acquireCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<AcquireSlotHoldResult> {
  const slot = normalizeCoachingSlotStart(startsAt);
  // 30s grace for client/server clock skew on future-day slots
  if (slot.getTime() <= Date.now() - 30_000) {
    return { ok: false, reason: "booked" };
  }

  await purgeExpiredCoachingSlotHolds();

  if (await isCoachSlotBooked(coachId, slot)) {
    return { ok: false, reason: "booked" };
  }

  const expiresAt = holdExpiresAt();
  try {
    const existing = await db
      .select()
      .from(schema.coachingSlotHolds)
      .where(
        and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          eq(schema.coachingSlotHolds.startsAt, slot),
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
        startsAt: slot,
        userId,
        expiresAt,
      });
      return { ok: true, expiresAt: expiresAt.toISOString() };
    } catch (error) {
      if (isMissingSlotHoldsTable(error)) {
        return { ok: true, expiresAt: expiresAt.toISOString() };
      }
      const retry = await db
        .select()
        .from(schema.coachingSlotHolds)
        .where(
          and(
            eq(schema.coachingSlotHolds.coachId, coachId),
            eq(schema.coachingSlotHolds.startsAt, slot),
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
  } catch (error) {
    if (isMissingSlotHoldsTable(error)) {
      return { ok: true, expiresAt: expiresAt.toISOString() };
    }
    throw error;
  }
}

export async function releaseCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
) {
  const slot = normalizeCoachingSlotStart(startsAt);
  try {
    await db
      .delete(schema.coachingSlotHolds)
      .where(
        and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          eq(schema.coachingSlotHolds.startsAt, slot),
          eq(schema.coachingSlotHolds.userId, userId),
        ),
      );
  } catch (error) {
    if (!isMissingSlotHoldsTable(error)) throw error;
  }
}

export async function releaseAllCoachingSlotHoldsForUser(userId: string) {
  try {
    await db
      .delete(schema.coachingSlotHolds)
      .where(eq(schema.coachingSlotHolds.userId, userId));
  } catch (error) {
    if (!isMissingSlotHoldsTable(error)) throw error;
  }
}

/** Active hold owned by this user (required before starting payment). */
export async function verifyActiveCoachingSlotHold(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<"ok" | "booked" | "missing" | "held_by_other"> {
  if (await isCoachSlotBooked(coachId, startsAt)) return "booked";

  await purgeExpiredCoachingSlotHolds();

  const slot = normalizeCoachingSlotStart(startsAt);
  try {
    const rows = await db
      .select()
      .from(schema.coachingSlotHolds)
      .where(
        and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          eq(schema.coachingSlotHolds.startsAt, slot),
        ),
      )
      .limit(1);

    const hold = rows[0];
    if (!hold || hold.expiresAt <= new Date()) return "missing";
    if (hold.userId !== userId) return "held_by_other";
    return "ok";
  } catch (error) {
    if (isMissingSlotHoldsTable(error)) return "ok";
    throw error;
  }
}

/** Final booking guard after payment (hold may have expired during checkout). */
export async function canFinalizeCoachingSlotBooking(
  userId: string,
  coachId: string,
  startsAt: Date,
): Promise<"ok" | "booked" | "held_by_other"> {
  const slot = normalizeCoachingSlotStart(startsAt);
  if (await isCoachSlotBooked(coachId, slot)) return "booked";

  await purgeExpiredCoachingSlotHolds();

  try {
    const rows = await db
      .select()
      .from(schema.coachingSlotHolds)
      .where(
        and(
          eq(schema.coachingSlotHolds.coachId, coachId),
          eq(schema.coachingSlotHolds.startsAt, slot),
          gt(schema.coachingSlotHolds.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const hold = rows[0];
    if (hold && hold.userId !== userId) return "held_by_other";
    return "ok";
  } catch (error) {
    if (isMissingSlotHoldsTable(error)) return "ok";
    throw error;
  }
}
