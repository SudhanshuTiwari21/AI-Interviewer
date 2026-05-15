import "server-only";

import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { listCoachOccupiedSlotStarts } from "@/lib/server/coaching-slot-holds";

export const runtime = "nodejs";

/** ISO start times for a coach that are booked or held by another candidate. */
export async function GET(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me?.emailVerified) return fail("invalid_credentials", "Please sign in first.", 401);

  const coachId = new URL(req.url).searchParams.get("coachId")?.trim();
  if (!coachId) return fail("validation_error", "coachId is required.", 400);

  const slots = await listCoachOccupiedSlotStarts(coachId, me.id);
  return ok({ slots });
}
