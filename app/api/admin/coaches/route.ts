import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { fail, ok } from "@/lib/api/response";
import { deleteCoach, listCoaches, upsertCoach } from "@/lib/server/coaches";
import type { Coach } from "@/lib/coaches";
import { db, schema } from "@/lib/db/client";
import { findUserByEmail } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

const CoachSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  title: z.string(),
  rating: z.number(),
  sessions: z.number(),
  focus: z.array(z.string()),
  techAreas: z.array(z.string()),
  hourlyRateInr: z.number().int().positive(),
  active: z.boolean(),
  timezone: z.string(),
  availability: z.object({
    weekdays: z.array(z.number().int()),
    startHour: z.number().int(),
    endHour: z.number().int(),
    intervalMin: z.union([z.literal(15), z.literal(30), z.literal(60)]),
  }),
});

export async function GET() {
  const ctx = await requirePermission("coaches.view");
  if (ctx instanceof NextResponse) return ctx;
  const coaches = await listCoaches();
  return ok({ coaches });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("coaches.update");
  if (ctx instanceof NextResponse) return ctx;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = CoachSchema.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }
  const coach = parsed.data as Coach;
  const existing = await findUserByEmail(coach.email);
  if (!existing) {
    return fail(
      "validation_error",
      "Coach email is not registered. Ask this user to sign up first, then add as coach.",
      400,
    );
  }
  await upsertCoach(coach);
  if (existing.role !== "coach") {
    await db
      .update(schema.users)
      .set({
        role: "coach",
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id));
  }
  return ok({ saved: true, promotedCoach: true, requiresEmailVerification: !existing.emailVerified });
}

export async function DELETE(req: Request) {
  const ctx = await requirePermission("coaches.delete");
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return fail("validation_error", "Coach id is required.", 400);
  const coaches = await listCoaches();
  const coach = coaches.find((x) => x.id === id);
  await deleteCoach(id);
  if (coach?.email) {
    const existing = await findUserByEmail(coach.email);
    if (existing?.role === "coach") {
      await db
        .update(schema.users)
        .set({
          role: "user",
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id));
    }
  }
  return ok({ deleted: true });
}
