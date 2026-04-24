"use client";

/**
 * Text-to-speech wrapper around the browser Speech Synthesis API.
 * Emits lifecycle events so the 3D avatar can sync mouth animation.
 */

type SpeakHandlers = {
  onStart?: () => void;
  onBoundary?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
};

export function isTTSSupported() {
  return (
    typeof window !== "undefined" && "speechSynthesis" in window
  );
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, handlers: SpeakHandlers = {}) {
  if (!isTTSSupported()) {
    handlers.onError?.("TTS not supported in this browser.");
    return;
  }
  cancelSpeech();

  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.98;
  utter.pitch = 1;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(
      (v) =>
        /en-?US/i.test(v.lang) &&
        /female|woman|samantha|victoria|karen|zira|ava|aria|alloy|nova|luna/i.test(
          v.name,
        ),
    ) ??
    voices.find((v) => /en-?US/i.test(v.lang) && /enhanced|premium|natural/i.test(v.name)) ??
    voices.find((v) => /en-?US/i.test(v.lang)) ??
    voices[0];
  if (preferred) utter.voice = preferred;

  utter.onstart = () => handlers.onStart?.();
  utter.onboundary = () => handlers.onBoundary?.();
  utter.onend = () => {
    if (currentUtterance === utter) currentUtterance = null;
    handlers.onEnd?.();
  };
  utter.onerror = (e) => {
    handlers.onError?.(e.error || "tts-error");
  };

  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function cancelSpeech() {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) return resolve();
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) return resolve();
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(resolve, 800);
  });
}
