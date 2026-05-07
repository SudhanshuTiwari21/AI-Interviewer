import "server-only";

import { eq, sql } from "drizzle-orm";
import { WebhookReceiver } from "livekit-server-sdk";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function webhookJwtFromRequest(req: Request): string | undefined {
  const raw =
    req.headers.get("authorization")?.trim() ||
    req.headers.get("Authorization")?.trim() ||
    req.headers.get("Authorize")?.trim();
  if (!raw) return undefined;
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw;
}

function parseBookingIdFromRoomMetadata(metadata: string | undefined): string | null {
  if (!metadata?.trim()) return null;
  try {
    const parsed = JSON.parse(metadata) as { bookingId?: unknown };
    const id = parsed.bookingId;
    if (typeof id === "string" && id.length > 0) return id;
  } catch {
    /* ignore */
  }
  return null;
}

async function resolveBookingIdFromRoom(roomName: string, metadata?: string) {
  const fromMeta = parseBookingIdFromRoomMetadata(metadata);
  if (fromMeta) return fromMeta;
  const rows = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.meetingRoomName, roomName))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return fail("internal_error", "LiveKit webhook verification is not configured.", 500);
  }

  const body = await req.text();
  const jwt = webhookJwtFromRequest(req);
  const skipAuth =
    process.env.NODE_ENV !== "production" && process.env.LIVEKIT_SKIP_WEBHOOK_VERIFY === "true";

  const receiver = new WebhookReceiver(apiKey, apiSecret);
  let event: Awaited<ReturnType<WebhookReceiver["receive"]>>;
  try {
    event = await receiver.receive(body, jwt, skipAuth);
  } catch {
    return fail("invalid_credentials", "Invalid LiveKit webhook signature or payload.", 401);
  }

  switch (event.event) {
    case "room_started": {
      const roomName = event.room?.name?.trim();
      if (!roomName) return ok({ ingested: true, ignored: true });
      const bookingId = await resolveBookingIdFromRoom(roomName, event.room?.metadata);
      if (!bookingId) return ok({ ingested: true, ignored: true });
      await db
        .update(schema.coachingBookings)
        .set({
          meetingStatus: "active",
          meetingStartedAt: sql`COALESCE(${schema.coachingBookings.meetingStartedAt}, NOW())`,
          updatedAt: new Date(),
        })
        .where(eq(schema.coachingBookings.id, bookingId));
      return ok({ ingested: true, type: event.event });
    }

    case "room_finished": {
      const roomName = event.room?.name?.trim();
      if (!roomName) return ok({ ingested: true, ignored: true });
      const bookingId = await resolveBookingIdFromRoom(roomName, event.room?.metadata);
      if (!bookingId) return ok({ ingested: true, type: event.event, ignored: true });
      await db
        .update(schema.coachingBookings)
        .set({
          meetingStatus: "ended",
          meetingEndedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.coachingBookings.id, bookingId));
      return ok({ ingested: true, type: event.event });
    }

    case "egress_ended":
      // Recording is intentionally not wired in this phase.
      return ok({ ingested: true, type: event.event, ignored: true });

    default:
      return ok({ ingested: true, type: event.event, ignored: true });
  }
}
