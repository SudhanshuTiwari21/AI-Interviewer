import "server-only";

import { desc, eq, inArray, or, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db, schema } from "@/lib/db/client";
import { type Coach } from "@/lib/coaches";

function rowToCoach(row: typeof schema.coaches.$inferSelect): Coach {
  const availability = (row.availability ?? {}) as Coach["availability"];
  const legacyStartHour = (availability as { startHour?: number }).startHour;
  const legacyEndHour = (availability as { endHour?: number }).endHour;
  const rawWindows = (availability as {
    windows?: Array<{
      startMinute?: number;
      endMinute?: number;
      startHour?: number;
      endHour?: number;
    }>;
  }).windows;

  function normalizeWindow(window: {
    startMinute?: number;
    endMinute?: number;
    startHour?: number;
    endHour?: number;
  }): { startMinute: number; endMinute: number } | null {
    const smRaw = window.startMinute;
    const emRaw = window.endMinute;
    if (smRaw !== undefined && emRaw !== undefined) {
      const sm = Number(smRaw);
      const em = Number(emRaw);
      if (Number.isFinite(sm) && Number.isFinite(em)) {
        const startMinute = Math.max(0, Math.min(23 * 60 + 59, Math.round(sm)));
        const endMinute = Math.max(0, Math.min(23 * 60 + 59, Math.round(em)));
        if (startMinute < endMinute && endMinute - startMinute >= 30) {
          return { startMinute, endMinute };
        }
        return null;
      }
    }
    const startMinute = Math.max(0, Math.min(23 * 60 + 59, (Number(window.startHour ?? 9) || 9) * 60));
    const endMinute = Math.max(0, Math.min(23 * 60 + 59, (Number(window.endHour ?? 18) || 18) * 60));
    if (startMinute < endMinute && endMinute - startMinute >= 30) {
      return { startMinute, endMinute };
    }
    return null;
  }

  const rawSlotStep = (availability as { slotStepMin?: unknown }).slotStepMin;
  let slotStepMin = 30;
  if (rawSlotStep !== undefined && Number.isFinite(Number(rawSlotStep))) {
    slotStepMin = Math.min(180, Math.max(15, Math.round(Number(rawSlotStep))));
  }

  const rawDayWindows = (availability as { dayWindows?: unknown }).dayWindows;
  let dayWindows: Coach["availability"]["dayWindows"] | undefined;
  if (rawDayWindows && typeof rawDayWindows === "object" && !Array.isArray(rawDayWindows)) {
    const dw: NonNullable<Coach["availability"]["dayWindows"]> = {};
    for (const [key, val] of Object.entries(rawDayWindows as Record<string, unknown>)) {
      const day = Number(key);
      if (!Number.isInteger(day) || day < 0 || day > 6) continue;
      if (!Array.isArray(val)) continue;
      const parsed = val
        .map((w) => normalizeWindow((w ?? {}) as Record<string, unknown>))
        .filter((w): w is NonNullable<typeof w> => w !== null);
      if (parsed.length > 0) dw[day] = parsed;
    }
    if (Object.keys(dw).length > 0) dayWindows = dw;
  }

  const normalizedWindows =
    rawWindows && rawWindows.length > 0
      ? rawWindows.map((w) => normalizeWindow(w)).filter((w): w is NonNullable<typeof w> => w !== null)
      : [
          {
            startMinute: (legacyStartHour ?? 9) * 60,
            endMinute: Math.min(23 * 60 + 59, (legacyEndHour ?? 18) * 60),
          },
        ].flatMap((w) => {
          const n = normalizeWindow(w);
          return n ? [n] : [];
        });
  const windowsFinal =
    normalizedWindows.length > 0
      ? normalizedWindows
      : [{ startMinute: 9 * 60, endMinute: 18 * 60 }];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    title: row.title,
    description: row.description ?? "",
    rating: Number((row.rating ?? 0) / 10),
    sessions: row.sessions,
    focus: (row.focus as string[]) ?? [],
    techAreas: (row.techAreas as string[]) ?? [],
    perSessionRateInr: row.perSessionRateInr,
    active: row.active,
    timezone: row.timezone,
    availability: {
      weekdays: availability.weekdays ?? [1, 2, 3, 4, 5],
      windows: windowsFinal,
      slotStepMin,
      ...(dayWindows ? { dayWindows } : {}),
    },
  };
}

function coachToInsert(coach: Coach): typeof schema.coaches.$inferInsert {
  return {
    id: coach.id,
    name: coach.name,
    email: coach.email,
    title: coach.title,
    description: coach.description,
    sessions: coach.sessions,
    focus: coach.focus as unknown as Record<string, unknown>,
    techAreas: coach.techAreas as unknown as Record<string, unknown>,
    perSessionRateInr: coach.perSessionRateInr,
    active: coach.active,
    timezone: coach.timezone,
    availability: coach.availability as unknown as Record<string, unknown>,
    updatedAt: new Date(),
  };
}

export async function listCoaches(options?: { activeOnly?: boolean }): Promise<Coach[]> {
  const q = db.select().from(schema.coaches).orderBy(desc(schema.coaches.createdAt));
  const rows = options?.activeOnly
    ? await q.where(eq(schema.coaches.active, true))
    : await q;
  const base = rows.map(rowToCoach);
  if (base.length === 0) return [];

  const coachIds = base.map((coach) => coach.id);
  const aggregates = await db
    .select({
      coachId: schema.coachingFeedback.coachId,
      avgRating: sql<number>`COALESCE(AVG(${schema.coachingFeedback.rating}), 0)`,
      reviewCount: sql<number>`COUNT(*)`,
    })
    .from(schema.coachingFeedback)
    .where(inArray(schema.coachingFeedback.coachId, coachIds))
    .groupBy(schema.coachingFeedback.coachId);
  const aggregateMap = new Map(
    aggregates.map((row) => [
      row.coachId,
      {
        avgRating: Number(row.avgRating),
        reviewCount: Number(row.reviewCount),
      },
    ]),
  );

  const feedbackRows = await db
    .select({
      coachId: schema.coachingFeedback.coachId,
      rating: schema.coachingFeedback.rating,
      feedbackText: schema.coachingFeedback.feedbackText,
      candidateName: schema.coachingFeedback.candidateName,
      createdAt: schema.coachingFeedback.createdAt,
    })
    .from(schema.coachingFeedback)
    .where(inArray(schema.coachingFeedback.coachId, coachIds))
    .orderBy(desc(schema.coachingFeedback.createdAt))
    .limit(500);

  const feedbackMap = new Map<string, Coach["recentFeedbacks"]>();
  for (const row of feedbackRows) {
    const text = row.feedbackText?.trim();
    if (!text) continue;
    const list = feedbackMap.get(row.coachId) ?? [];
    if (list.length < 5) {
      list.push({
        rating: row.rating,
        feedbackText: text,
        candidateName: row.candidateName,
        createdAt: row.createdAt.toISOString(),
      });
      feedbackMap.set(row.coachId, list);
    }
  }

  return base.map((coach) => {
    const aggregate = aggregateMap.get(coach.id);
    return {
      ...coach,
      rating: aggregate ? Number(aggregate.avgRating.toFixed(2)) : 0,
      reviewCount: aggregate?.reviewCount ?? 0,
      recentFeedbacks: feedbackMap.get(coach.id) ?? [],
    };
  });
}

export async function getCoachById(id: string): Promise<Coach | null> {
  const rows = await db.select().from(schema.coaches).where(eq(schema.coaches.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return rowToCoach(row);
}

export async function upsertCoach(coach: Coach): Promise<void> {
  await db
    .insert(schema.coaches)
    .values(coachToInsert(coach))
    .onConflictDoUpdate({
      target: schema.coaches.id,
      set: {
        ...coachToInsert(coach),
        updatedAt: new Date(),
      },
    });
}

export async function deleteCoach(id: string): Promise<void> {
  await db
    .delete(schema.coachingSlotHolds)
    .where(eq(schema.coachingSlotHolds.coachId, id));
  await db
    .delete(schema.coachingFeedback)
    .where(eq(schema.coachingFeedback.coachId, id));
  await db
    .delete(schema.coachingBookings)
    .where(eq(schema.coachingBookings.coachId, id));
  await db.delete(schema.coaches).where(eq(schema.coaches.id, id));
}

type DbLike = Pick<NodePgDatabase<typeof schema>, "delete" | "select">;

/**
 * Deletes all coaching bookings for this coach (cascades transcripts, alerts,
 * refund rows, etc.) and removes matching coach profile rows. Call inside a
 * transaction with the user delete when removing an account.
 */
export async function deleteCoachArtifactsForUserEmail(
  dbOrTx: DbLike,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const coachRows = await dbOrTx
    .select({ id: schema.coaches.id })
    .from(schema.coaches)
    .where(sql`LOWER(${schema.coaches.email}) = ${normalized}`);

  const coachIds = coachRows.map((r) => r.id);
  const bookingPredicate =
    coachIds.length > 0
      ? or(
          inArray(schema.coachingBookings.coachId, coachIds),
          sql`LOWER(${schema.coachingBookings.coachEmail}) = ${normalized}`,
        )
      : sql`LOWER(${schema.coachingBookings.coachEmail}) = ${normalized}`;

  await dbOrTx.delete(schema.coachingBookings).where(bookingPredicate);
  await dbOrTx
    .delete(schema.coaches)
    .where(sql`LOWER(${schema.coaches.email}) = ${normalized}`);
}
