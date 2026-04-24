"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { store } from "@/lib/store";
import { ROLES, LEVELS, FOCUS_AREAS, type Role, type Level } from "@/lib/mock-data";
import { cn, uid } from "@/lib/utils";
import { LiveTranscriber } from "@/lib/speech";
import {
  Check,
  Mic,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Volume2,
  ArrowLeft,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("Frontend Engineer");
  const [level, setLevel] = useState<Level>("Senior");
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "System design",
    "Communication",
  ]);
  const [questions, setQuestions] = useState(6);
  const [micChecked, setMicChecked] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    if (!store.getUser()) router.replace("/login?next=/interview/setup");
  }, [router]);

  function toggleFocus(f: string) {
    setFocusAreas((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  async function checkMic() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicChecked(true);
    } catch {
      setMicError("Microphone permission was denied. You can still answer by typing.");
    }
  }

  function startInterview() {
    store.setConfig({ role, level, focusAreas, totalQuestions: questions });
    const id = uid("ses");
    router.push(`/interview/${id}`);
  }

  const sttSupported = typeof window !== "undefined" && LiveTranscriber.isSupported();

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-5xl items-center justify-between">
          <Logo />
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
          >
            Back to dashboard
          </Button>
        </div>
      </header>
      <main className="container max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="accent" dot>
            Configure interview
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Tell us about the role you're targeting.
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            We'll calibrate the rubric and warm up the AI interviewer.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          <Card>
            <CardBody className="space-y-6">
              <Field label="Role">
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <Pill
                      key={r}
                      active={role === r}
                      onClick={() => setRole(r)}
                    >
                      {r}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field label="Seniority">
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <Pill
                      key={l}
                      active={level === l}
                      onClick={() => setLevel(l)}
                    >
                      {l}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field
                label="Focus areas"
                hint="Pick the dimensions you want stressed during the mock."
              >
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((f) => (
                    <Pill
                      key={f}
                      active={focusAreas.includes(f)}
                      onClick={() => toggleFocus(f)}
                    >
                      {f}
                    </Pill>
                  ))}
                </div>
              </Field>
              <Field
                label="Number of questions"
                hint="A typical session lasts 25–45 minutes."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={3}
                    max={8}
                    step={1}
                    value={questions}
                    onChange={(e) => setQuestions(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-100 accent-ink-900"
                  />
                  <span className="w-10 text-sm font-medium text-ink-900">
                    {questions}
                  </span>
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Volume2 className="size-4 text-accent-600" /> Mic check
                </p>
                <p className="mt-1.5 text-xs leading-5 text-ink-500">
                  We'll request browser permission to capture your voice. You
                  can always answer by typing instead.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Button
                    variant={micChecked ? "outline" : "primary"}
                    size="sm"
                    onClick={checkMic}
                    leftIcon={
                      micChecked ? <Check className="size-4" /> : <Mic className="size-4" />
                    }
                  >
                    {micChecked ? "Microphone ready" : "Test microphone"}
                  </Button>
                  {micError && (
                    <span className="text-xs text-danger-600">{micError}</span>
                  )}
                </div>
              </div>
              <div className="rounded-xl bg-ink-50 p-4 text-xs text-ink-700">
                <p className="inline-flex items-center gap-2 font-medium text-ink-900">
                  <ShieldCheck className="size-3.5 text-success-500" />{" "}
                  Browser support
                </p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        sttSupported ? "bg-success-500" : "bg-warn-500",
                      )}
                    />
                    Live transcription:{" "}
                    {sttSupported
                      ? "available in this browser"
                      : "fallback to typed answers"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    Voice recording: MediaRecorder API
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    AI follow-ups: GPT-4o powered
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-5 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-ink-700">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-ink-900 text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="font-medium text-ink-900">Ready to begin?</p>
                <p className="text-xs text-ink-500">
                  {questions} questions · ~{Math.round(questions * 5)} min ·{" "}
                  {role}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={startInterview}
              rightIcon={<ArrowRight className="size-4" />}
            >
              Start interview
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-ink-900 bg-ink-900 text-white"
          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      {active && <Check className="size-3" />}
      {children}
    </button>
  );
}
