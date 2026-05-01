import "server-only";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { detectModerationFlags } from "@/lib/meeting/moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WebhookBody = z.object({
  event: z.string().min(1),
  roomName: z.string().trim().min(1).optional(),
  bookingId: z.string().uuid().optional(),
  recordingUrl: z.string().trim().optional(),
  transcriptText: z.string().trim().optional(),
  speakerRole: z.string().trim().optional(),
  speakerName: z.string().trim().optional(),
  chunkIndex: z.number().int().nonnegative().optional(),
  confidence: z.number().int().nonnegative().max(100).optional(),
  startsAtMs: z.number().int().nonnegative().optional(),
  endsAtMs: z.number().int().nonnegative().optional(),
});

async function resolveBookingId(data: z.infer<typeof WebhookBody>) {
  if (data.bookingId) return data.bookingId;
  if (!data.roomName) return null;
  const rows = await db
    .select({ id: schema.coachingBookings.id })
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.meetingRoomName, data.roomName))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.LIVEKIT_WEBHOOK_SECRET?.trim();
  if (secret) {
    const incoming = req.headers.get("x-livekit-secret")?.trim();
    if (!incoming || incoming !== secret) {
      return fail("invalid_credentials", "Unauthorized webhook request.", 401);
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = WebhookBody.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", parsed.error.issues[0]?.message ?? "Invalid payload", 400);
  }
  const data = parsed.data;
  const bookingId = await resolveBookingId(data);
  if (!bookingId) return fail("validation_error", "Could not resolve booking.", 400);

  if (data.event === "egress.ended") {
    await db
      .update(schema.coachingBookings)
      .set({
        recordingStatus: "completed",
        recordingUrl: data.recordingUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.coachingBookings.id, bookingId));
    return ok({ ingested: true, type: data.event });
  }

  if (data.event === "room.finished") {
    await db
      .update(schema.coachingBookings)
      .set({
        meetingStatus: "ended",
        meetingEndedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.coachingBookings.id, bookingId));
    return ok({ ingested: true, type: data.event });
  }

  if (data.event === "transcript.chunk") {
    if (!data.transcriptText) {
      return fail("validation_error", "transcriptText is required.", 400);
    }
    const inserted = await db
      .insert(schema.meetingTranscripts)
      .values({
        bookingId,
        speakerRole: data.speakerRole ?? "system",
        speakerName: data.speakerName ?? null,
        transcriptText: data.transcriptText,
        chunkIndex: data.chunkIndex ?? 0,
        confidence: data.confidence ?? null,
        startsAtMs: data.startsAtMs ?? null,
        endsAtMs: data.endsAtMs ?? null,
        source: "live",
      })
      .returning({ id: schema.meetingTranscripts.id });
    const transcriptId = inserted[0]?.id;

    const matches = detectModerationFlags(data.transcriptText);
    for (const match of matches) {
      await db.insert(schema.meetingModerationAlerts).values({
        bookingId,
        transcriptId: transcriptId ?? null,
        severity: match.severity,
        category: match.category,
        title: match.title,
        evidenceText: data.transcriptText,
        confidence: data.confidence ?? 70,
        status: "open",
      });
    }
    return ok({ ingested: true, type: data.event, alertsCreated: matches.length });
  }

  return ok({ ingested: true, type: data.event, ignored: true });
}
