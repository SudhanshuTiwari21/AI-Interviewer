import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  alertId: z.string().uuid(),
  status: z.enum(["resolved", "dismissed"]),
});

async function requireAdmin() {
  const session = await getSessionFromCookie();
  if (!session) return null;
  const me = await findUserById(session.sub);
  if (!me) return null;
  const isAdmin = me.role === "admin" || me.role === "super_admin" || me.role === "sub_admin";
  if (!isAdmin) return null;
  return me;
}

export async function GET() {
  const me = await requireAdmin();
  if (!me) return fail("invalid_credentials", "Unauthorized.", 401);

  const alerts = await db
    .select({
      id: schema.meetingModerationAlerts.id,
      bookingId: schema.meetingModerationAlerts.bookingId,
      severity: schema.meetingModerationAlerts.severity,
      category: schema.meetingModerationAlerts.category,
      title: schema.meetingModerationAlerts.title,
      evidenceText: schema.meetingModerationAlerts.evidenceText,
      confidence: schema.meetingModerationAlerts.confidence,
      status: schema.meetingModerationAlerts.status,
      createdAt: schema.meetingModerationAlerts.createdAt,
      candidateName: schema.coachingBookings.candidateName,
      coachName: schema.coachingBookings.coachName,
      startsAt: schema.coachingBookings.startsAt,
    })
    .from(schema.meetingModerationAlerts)
    .leftJoin(
      schema.coachingBookings,
      eq(schema.coachingBookings.id, schema.meetingModerationAlerts.bookingId),
    )
    .orderBy(desc(schema.meetingModerationAlerts.createdAt))
    .limit(500);

  return ok({ alerts });
}

export async function PATCH(req: Request) {
  const me = await requireAdmin();
  if (!me) return fail("invalid_credentials", "Unauthorized.", 401);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  await db
    .update(schema.meetingModerationAlerts)
    .set({
      status: parsed.data.status,
      resolvedAt: new Date(),
      resolvedBy: me.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.meetingModerationAlerts.id, parsed.data.alertId));

  return ok({ updated: true });
}
