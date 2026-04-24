"use client";

import OpenAI from "openai";

/**
 * Frontend-only OpenAI client for MVP.
 * IMPORTANT: this requires NEXT_PUBLIC_OPENAI_API_KEY and exposes the key to
 * the browser. Keep this only for demo/MVP environments.
 */
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export function hasOpenAIKey() {
  return Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY);
}
