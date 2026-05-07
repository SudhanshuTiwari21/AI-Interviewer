import "server-only";

import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { detectModerationFlags } from "@/lib/meeting/moderation";
import { resolveMeetingParticipantForBooking } from "@/lib/meeting/participant-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getServerOpenAIKey() {
  return process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";
}

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const me = await findUserById(session.sub);
  if (!me) return fail("invalid_credentials", "Please sign in first.", 401);

  const form = await req.formData();
  const bookingId = String(form.get("bookingId") ?? "");
  const chunkIndex = Number(form.get("chunkIndex") ?? "0");
  const participantIdentity = String(form.get("participantIdentity") ?? "").trim();
  const audio = form.get("audio");
  if (!bookingId) return fail("validation_error", "bookingId is required.", 400);
  if (participantIdentity && participantIdentity !== me.id) {
    return fail("validation_error", "participantIdentity does not match session.", 403);
  }
  if (!(audio instanceof File) || audio.size === 0) {
    return fail("validation_error", "Audio file is required.", 400);
  }

  const bookingRows = await db
    .select()
    .from(schema.coachingBookings)
    .where(eq(schema.coachingBookings.id, bookingId))
    .limit(1);
  const booking = bookingRows[0];
  if (!booking) return fail("user_not_found", "Booking not found.", 404);
  const attribution = await resolveMeetingParticipantForBooking(booking, me.id, me.email);
  if (!attribution) return fail("validation_error", "Not allowed for this booking.", 403);

  const apiKey = getServerOpenAIKey();
  if (!apiKey) return fail("internal_error", "Transcription service is not configured.", 500);
  const openai = new OpenAI({ apiKey });
  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "gpt-4o-mini-transcribe",
    language: "en",
    prompt:
      "Transcribe interview conversation with punctuation. Keep exact meaning and avoid expansion.",
  });
  const transcriptText = transcription.text?.trim() ?? "";
  if (!transcriptText) return ok({ transcript: "", alertsCreated: 0 });

  const inserted = await db
    .insert(schema.meetingTranscripts)
    .values({
      bookingId,
      speakerRole: attribution.role,
      speakerName: attribution.speakerName,
      transcriptText,
      chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex : 0,
      source: "live",
    })
    .returning({ id: schema.meetingTranscripts.id });

  const transcriptId = inserted[0]?.id;
  const matches = detectModerationFlags(transcriptText);
  for (const match of matches) {
    await db.insert(schema.meetingModerationAlerts).values({
      bookingId,
      transcriptId: transcriptId ?? null,
      severity: match.severity,
      category: match.category,
      title: match.title,
      evidenceText: transcriptText,
      confidence: 72,
      status: "open",
    });
  }

  return ok({ transcript: transcriptText, alertsCreated: matches.length });
}
