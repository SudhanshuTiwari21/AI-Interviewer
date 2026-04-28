import "server-only";

import OpenAI from "openai";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

function getServerOpenAIKey() {
  return process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return fail("invalid_credentials", "Please sign in first.", 401);

    const apiKey = getServerOpenAIKey();
    if (!apiKey) {
      return fail("internal_error", "Transcription service is not configured.", 500);
    }

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return fail("validation_error", "Audio file is required.", 400);
    }
    if (audio.size === 0) {
      return fail("validation_error", "Audio file is empty.", 400);
    }

    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "gpt-4o-mini-transcribe",
      language: "en",
      prompt:
        "Transcribe interview answers clearly with punctuation. Keep wording faithful and concise.",
    });

    const transcript = transcription.text?.trim() ?? "";
    if (!transcript) {
      return fail("internal_error", "Could not transcribe audio.", 422);
    }
    return ok({ transcript, provider: "openai" });
  } catch {
    return fail("internal_error", "Could not transcribe audio right now.", 500);
  }
}
