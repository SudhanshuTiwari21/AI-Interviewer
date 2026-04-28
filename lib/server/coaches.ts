import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { type Coach } from "@/lib/coaches";

function rowToCoach(row: typeof schema.coaches.$inferSelect): Coach {
  const availability = (row.availability ?? {}) as Coach["availability"];
  const legacyStartHour = (availability as { startHour?: number }).startHour;
  const legacyEndHour = (availability as { endHour?: number }).endHour;
  const normalizedWindows =
    availability.windows && availability.windows.length > 0
      ? availability.windows
      : [
          {
            startHour: legacyStartHour ?? 9,
            endHour: legacyEndHour ?? 18,
          },
        ];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    title: row.title,
    description: row.description ?? "",
    rating: Number((row.rating ?? 48) / 10),
    sessions: row.sessions,
    focus: (row.focus as string[]) ?? [],
    techAreas: (row.techAreas as string[]) ?? [],
    hourlyRateInr: row.hourlyRateInr,
    active: row.active,
    timezone: row.timezone,
    availability: {
      weekdays: availability.weekdays ?? [1, 2, 3, 4, 5],
      windows: normalizedWindows,
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
    rating: Math.round(coach.rating * 10),
    sessions: coach.sessions,
    focus: coach.focus as unknown as Record<string, unknown>,
    techAreas: coach.techAreas as unknown as Record<string, unknown>,
    hourlyRateInr: coach.hourlyRateInr,
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
  return rows.map(rowToCoach);
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
  await db.delete(schema.coaches).where(eq(schema.coaches.id, id));
}
