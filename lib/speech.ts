"use client";

/**
 * Lightweight wrapper around the Web Speech API for live transcription.
 * Falls back gracefully if the browser does not support SpeechRecognition.
 *
 * Replace this with a server-side Whisper / OpenAI transcription pipeline
 * by pushing the recorded audio Blob to a /api/transcribe endpoint.
 */

type AnyWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export type TranscriptHandlers = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

export class LiveTranscriber {
  private recognition: any | null = null;
  private active = false;
  private finalBuffer = "";

  static isSupported(): boolean {
    if (typeof window === "undefined") return false;
    const w = window as AnyWindow;
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  constructor(private handlers: TranscriptHandlers = {}) {
    if (typeof window === "undefined") return;
    const w = window as AnyWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          this.finalBuffer += transcript + " ";
          this.handlers.onFinal?.(this.finalBuffer.trim());
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        this.handlers.onPartial?.((this.finalBuffer + interim).trim());
      }
    };
    r.onerror = (event: any) => {
      this.handlers.onError?.(event?.error || "speech-error");
    };
    r.onend = () => {
      this.active = false;
      this.handlers.onEnd?.();
    };
    this.recognition = r;
  }

  start() {
    if (!this.recognition || this.active) return;
    this.active = true;
    try {
      this.recognition.start();
    } catch {
      // start() can throw if called twice in quick succession; ignore.
    }
  }

  stop() {
    if (!this.recognition || !this.active) return;
    this.active = false;
    this.recognition.stop();
  }

  reset() {
    this.finalBuffer = "";
  }
}

export type RecorderState = "idle" | "recording" | "stopped";

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  state: RecorderState = "idle";

  async start() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      throw new Error("Microphone access is not available in this browser.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(250);
    this.state = "recording";
  }

  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder) return null;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder!.stop();
      this.state = "stopped";
    });
  }

  cancel() {
    if (this.mediaRecorder && this.state === "recording") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.state = "idle";
  }
}
