import "server-only";

import { z } from "zod";
import { COACHING_SLOT_HOLD_MINUTES } from "@/lib/coaching/constants";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import {
  acquireCoachingSlotHold,
  normalizeCoachingSlotStart,
  releaseAllCoachingSlotHoldsForUser,
  releaseCoachingSlotHold,
} from "@/lib/server/coaching-slot-holds";

export const runtime = "nodejs";

const SlotBody = z.object({
  coachId: z.string().trim().min(2),
  startsAt: z
    .string()
    .min(16)
    .max(44)
    .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid slot time."),
});

function softHoldExpiry() {
  return new Date(Date.now() + COACHING_SLOT_HOLD_MINUTES * 60 * 1000).toISOString();
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
    const me = await findUserById(session.sub);
    if (!me?.emailVerified) return fail("invalid_credentials", "Please sign in first.", 401);

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return fail("validation_error", "Invalid JSON body", 400);
    }
    const parsed = SlotBody.safeParse(json);
    if (!parsed.success) {
      return fail(
        "validation_error",
        parsed.error.issues[0]?.message ?? "Invalid input",
        400,
      );
    }

    const startsAt = normalizeCoachingSlotStart(new Date(parsed.data.startsAt));
    const result = await acquireCoachingSlotHold(me.id, parsed.data.coachId, startsAt);
    if (!result.ok) {
      const message =
        result.reason === "booked"
          ? "This slot is no longer available."
          : "Another candidate is reserving this slot. Try again in a moment.";
      return fail("validation_error", message, 409);
    }
    return ok({ expiresAt: result.expiresAt });
  } catch (error) {
    console.error("[coaching/slot-holds] POST", error);
    return ok({ expiresAt: softHoldExpiry(), holdSkipped: true });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
    const me = await findUserById(session.sub);
    if (!me?.emailVerified) return fail("invalid_credentials", "Please sign in first.", 401);

    let json: unknown = null;
    try {
      json = await req.json();
    } catch {
      /* empty body → release all holds for user */
    }

    if (!json || (typeof json === "object" && Object.keys(json as object).length === 0)) {
      await releaseAllCoachingSlotHoldsForUser(me.id);
      return ok({});
    }

    const parsed = SlotBody.safeParse(json);
    if (!parsed.success) {
      return fail(
        "validation_error",
        parsed.error.issues[0]?.message ?? "Invalid input",
        400,
      );
    }

    await releaseCoachingSlotHold(
      me.id,
      parsed.data.coachId,
      normalizeCoachingSlotStart(new Date(parsed.data.startsAt)),
    );
    return ok({});
  } catch (error) {
    console.error("[coaching/slot-holds] DELETE", error);
    return ok({});
  }
}
