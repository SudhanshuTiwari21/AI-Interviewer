"use client";

import { useEffect, useRef, useState } from "react";
import { cn, secondsToClock } from "@/lib/utils";
import { LiveTranscriber, VoiceRecorder } from "@/lib/speech";
import { Button } from "@/components/ui/Button";
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Square,
  Type as TypeIcon,
  AudioLines,
} from "lucide-react";

type Mode = "voice" | "text";

export function Recorder({
  onSubmit,
  disabled,
}: {
  onSubmit: (payload: {
    transcript: string;
    durationSec: number;
    mode: Mode;
  }) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("voice");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [partial, setPartial] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<VoiceRecorder | null>(null);
  const transcriberRef = useRef<LiveTranscriber | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopMeter();
      transcriberRef.current?.stop();
      recorderRef.current?.cancel();
    };
  }, []);

  function startTimer() {
    stopTimer();
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }
  function stopTimer() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  async function startMeter() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg =
          data.reduce((s, v) => s + v, 0) / Math.max(data.length, 1);
        setLevel(Math.min(1, avg / 110));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
      // Stash stream stop on recorder cleanup
      (audioCtxRef.current as any)._stream = stream;
    } catch {
      // ignore — we already have the recorder permission flow
    }
  }
  function stopMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const stream: MediaStream | undefined = (audioCtxRef.current as any)?._stream;
    stream?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
  }

  async function startRecording() {
    setError(null);
    setTranscript("");
    setPartial("");
    setSeconds(0);
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      recorderRef.current = recorder;
    } catch (e: any) {
      setError(e?.message ?? "Could not access microphone.");
      return;
    }
    if (LiveTranscriber.isSupported()) {
      const t = new LiveTranscriber({
        onPartial: (text) => setPartial(text),
        onFinal: (text) => {
          setTranscript(text);
          setPartial(text);
        },
        onError: (msg) => {
          if (msg !== "no-speech" && msg !== "aborted") {
            setError(`Transcription: ${msg}`);
          }
        },
      });
      t.start();
      transcriberRef.current = t;
    }
    void startMeter();
    startTimer();
    setRecording(true);
    setPaused(false);
  }

  function togglePause() {
    if (!recording) return;
    setPaused((p) => {
      const next = !p;
      if (next) {
        stopTimer();
        transcriberRef.current?.stop();
      } else {
        startTimer();
        transcriberRef.current?.start();
      }
      return next;
    });
  }

  async function stopRecording(submit = false) {
    stopTimer();
    stopMeter();
    transcriberRef.current?.stop();
    await recorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
    if (submit) {
      const finalText = (transcript || partial).trim();
      onSubmit({ transcript: finalText, durationSec: seconds, mode: "voice" });
      reset();
    }
  }

  function submitText() {
    const t = textAnswer.trim();
    if (!t) return;
    onSubmit({ transcript: t, durationSec: Math.max(30, t.length / 6), mode: "text" });
    reset();
  }

  function reset() {
    setTextAnswer("");
    setTranscript("");
    setPartial("");
    setSeconds(0);
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <div className="inline-flex rounded-lg bg-ink-100 p-0.5">
          <button
            onClick={() => setMode("voice")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "voice"
                ? "bg-white text-ink-900 shadow-soft"
                : "text-ink-500 hover:text-ink-700",
            )}
          >
            <AudioLines className="size-3.5" /> Voice
          </button>
          <button
            onClick={() => setMode("text")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "text"
                ? "bg-white text-ink-900 shadow-soft"
                : "text-ink-500 hover:text-ink-700",
            )}
          >
            <TypeIcon className="size-3.5" /> Type
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          {recording && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  paused ? "bg-warn-500" : "animate-pulse bg-danger-500",
                )}
              />
              {paused ? "Paused" : "Recording"}
            </span>
          )}
          <span className="font-mono tabular-nums">{secondsToClock(seconds)}</span>
        </div>
      </div>

      {mode === "voice" ? (
        <div className="p-5">
          <div className="rounded-xl bg-ink-50/70 p-4">
            <div className="flex h-16 items-center justify-center gap-1">
              {Array.from({ length: 36 }).map((_, i) => {
                const base = recording && !paused ? 8 + Math.random() * 36 * level : 4;
                return (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-ink-300"
                    style={{
                      height: `${Math.max(4, base * (0.6 + Math.sin(i / 3) * 0.4))}px`,
                      background: recording && !paused ? "#3a66f5" : undefined,
                      transition: "height 100ms linear, background 200ms",
                    }}
                  />
                );
              })}
            </div>
            <div className="mt-3 min-h-[88px] rounded-lg bg-white p-3 text-sm leading-6 text-ink-700">
              {partial || transcript || (
                <span className="text-ink-400">
                  {recording
                    ? "Listening… speak naturally."
                    : "Press record to begin. Your transcript will stream here."}
                </span>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-3 text-xs text-danger-600">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!recording ? (
                <Button
                  onClick={startRecording}
                  disabled={disabled}
                  leftIcon={<Mic className="size-4" />}
                >
                  Start recording
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={togglePause}
                    leftIcon={
                      paused ? <Play className="size-4" /> : <Pause className="size-4" />
                    }
                  >
                    {paused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => stopRecording(false)}
                    leftIcon={<Square className="size-4" />}
                  >
                    Discard
                  </Button>
                </>
              )}
            </div>
            <Button
              onClick={() => stopRecording(true)}
              disabled={!recording || (!transcript && !partial)}
              variant="primary"
            >
              Submit answer
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your answer here. Press Cmd+Enter to submit."
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitText();
            }}
            disabled={disabled}
            className="min-h-[180px] w-full resize-y rounded-xl border border-ink-200 bg-white p-3 text-sm leading-6 text-ink-900 outline-none transition-colors hover:border-ink-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/10"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-ink-400">
              {textAnswer.trim().split(/\s+/).filter(Boolean).length} words
            </p>
            <Button onClick={submitText} disabled={!textAnswer.trim()}>
              Submit answer
            </Button>
          </div>
        </div>
      )}

      {!LiveTranscriber.isSupported() && mode === "voice" && (
        <div className="border-t border-ink-100 bg-warn-50 px-4 py-3 text-xs text-warn-600">
          <span className="inline-flex items-center gap-1.5">
            <MicOff className="size-3.5" /> Live transcription isn't supported
            in this browser. Audio is still recorded; we'll transcribe on
            submit.
          </span>
        </div>
      )}
    </div>
  );
}
