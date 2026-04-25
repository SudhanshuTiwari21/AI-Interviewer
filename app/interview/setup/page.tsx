"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ResumeUpload } from "@/components/interview/ResumeUpload";
import { store } from "@/lib/store";
import { ROLES, LEVELS, FOCUS_AREAS, type Role, type Level } from "@/lib/mock-data";
import type { ParsedResume } from "@/lib/resume";
import type { Difficulty } from "@/lib/question-engine";
import {
  attemptsPerMonth,
  canUsePremiumControls,
  canUseStressTest,
  normalizePlan,
  planLabel,
  usedAttemptsThisMonth,
  type DemoPlan,
} from "@/lib/plan-access";
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
  Crown,
  FileText,
  Gauge,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("Frontend Engineer");
  const [level, setLevel] = useState<Level>("Senior");
  const [focusAreas, setFocusAreas] = useState<string[]>([
    "System design",
    "Communication",
  ]);
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [micChecked, setMicChecked] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interviewerStyle, setInterviewerStyle] = useState<
    "balanced" | "bar-raiser" | "friendly"
  >("bar-raiser");
  const [companyTarget, setCompanyTarget] = useState("Google");
  const [stressTest, setStressTest] = useState(true);
  const [plan, setPlan] = useState<DemoPlan>("free");

  useEffect(() => {
    const user = store.getUser();
    if (!user) router.replace("/login?next=/interview/setup");
    setPlan(normalizePlan(user?.plan));
    const used = usedAttemptsThisMonth(
      store.getReports().map((r) => r.generatedAt),
    );
    setAttemptsUsed(used);
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
    if (!resume) return;
    store.setConfig({
      role,
      level,
      focusAreas,
      totalQuestions: 6,
      difficulty,
      resume,
      interviewerStyle: canUsePremiumControls(plan) ? interviewerStyle : "balanced",
      companyTarget: canUsePremiumControls(plan) ? companyTarget : undefined,
      stressTest: canUseStressTest(plan) ? stressTest : false,
    });
    const id = uid("ses");
    router.push(`/interview/${id}`);
  }

  const sttSupported =
    globalThis.window !== undefined && LiveTranscriber.isSupported();

  const planAttempts = attemptsPerMonth(plan);
  const blocked =
    planAttempts !== Number.POSITIVE_INFINITY && attemptsUsed >= planAttempts;
  const canStart = !blocked && !!resume;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-5xl items-center justify-between">
          <Logo size={24} />
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
            className="px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>
      <main className="container max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="accent" dot>
            Configure interview
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Drop your resume. We'll tailor every question.
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            Hiro reads your experience, projects and achievements, then
            calibrates difficulty to the role and target company.
          </p>
          {(plan === "pro" || plan === "team") && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700">
              <Crown className="size-3.5 text-amber-500" />
              {planLabel(plan)} plan unlocked: premium interview controls enabled
            </div>
          )}
        </div>

        <div className="mt-10 space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex size-8 items-center justify-center rounded-xl bg-ink-900 text-white">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Step 1 · Upload resume
                    </p>
                    <p className="text-xs text-ink-500">
                      Required. We'll drive the whole interview from this.
                    </p>
                  </div>
                </div>
                {resume && (
                  <Badge tone="success" dot>
                    Parsed
                  </Badge>
                )}
              </div>
              <ResumeUpload value={resume} onChange={setResume} />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-xl bg-ink-900 text-white">
                  <Gauge className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Step 2 · Role & difficulty
                  </p>
                  <p className="text-xs text-ink-500">
                    Shapes the question bar and counter-question aggressiveness.
                  </p>
                </div>
              </div>

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
                label="Difficulty"
                hint="Controls question bar; Hard also raises grading rigor."
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "easy",
                        title: "Easy",
                        sub: "Warm-up mode. Fundamentals and ramp questions.",
                      },
                      {
                        id: "medium",
                        title: "Medium",
                        sub: "Realistic loop. Mix of depth and trade-off probes.",
                      },
                      {
                        id: "hard",
                        title: "Hard",
                        sub: "Bar-raiser. Terse, demanding, metric-first.",
                      },
                    ] as Array<{ id: Difficulty; title: string; sub: string }>
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left text-sm transition-all",
                        difficulty === d.id
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                      )}
                    >
                      <p className="text-sm font-semibold">{d.title}</p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          difficulty === d.id ? "text-white/80" : "text-ink-500",
                        )}
                      >
                        {d.sub}
                      </p>
                    </button>
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
             
              {canUsePremiumControls(plan) && (
                <>
                  <Field
                    label="Interviewer style (Premium)"
                    hint="Simulate strict or supportive interviewer behavior."
                  >
                    <div className="flex flex-wrap gap-2">
                      <Pill
                        active={interviewerStyle === "bar-raiser"}
                        onClick={() => setInterviewerStyle("bar-raiser")}
                      >
                        Bar-raiser
                      </Pill>
                      <Pill
                        active={interviewerStyle === "balanced"}
                        onClick={() => setInterviewerStyle("balanced")}
                      >
                        Balanced
                      </Pill>
                      <Pill
                        active={interviewerStyle === "friendly"}
                        onClick={() => setInterviewerStyle("friendly")}
                      >
                        Friendly
                      </Pill>
                    </div>
                  </Field>
                  <Field
                    label="Company target (Premium)"
                    hint="Bias prompts toward specific company-style interviews."
                  >
                    <div className="flex flex-wrap gap-2">
                      {["Google", "Amazon", "Meta", "Stripe", "Anthropic"].map(
                        (c) => (
                          <Pill
                            key={c}
                            active={companyTarget === c}
                            onClick={() => setCompanyTarget(c)}
                          >
                            {c}
                          </Pill>
                        ),
                      )}
                    </div>
                  </Field>
                  <Field label="Stress test mode (Team)">
                    <button
                      type="button"
                      onClick={() => {
                        if (canUseStressTest(plan)) setStressTest((v) => !v);
                      }}
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1.5 text-xs font-medium",
                        stressTest
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-700",
                        !canUseStressTest(plan) && "cursor-not-allowed opacity-60",
                      )}
                      disabled={!canUseStressTest(plan)}
                    >
                      {stressTest ? "Enabled" : "Disabled"}
                    </button>
                    {!canUseStressTest(plan) && (
                      <p className="mt-2 text-xs text-ink-500">
                        Upgrade to Team to enable stress-test mode.
                      </p>
                    )}
                  </Field>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Volume2 className="size-4 text-accent-600" /> Mic check
                </p>
                <p className="mt-1.5 text-xs leading-5 text-ink-500">
                  The 3D interviewer will speak questions out loud. You can
                  answer by typing or speaking back.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
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
                  {micError && <span className="text-xs text-danger-600">{micError}</span>}
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
                    Speaking interviewer: Web Speech TTS
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-success-500" />
                    Adaptive follow-ups: enabled
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-ink-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex items-start gap-3 text-sm text-ink-700">
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-ink-900 text-white">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="font-medium text-ink-900">Ready to begin?</p>
                <p className="text-xs text-ink-500">
                  Resume-driven · {difficulty} difficulty · ~25–45 min · {role}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={startInterview}
              rightIcon={<ArrowRight className="size-4" />}
              disabled={!canStart}
              className="w-full sm:w-auto"
            >
              {blocked
                ? "No attempts left this month"
                : !resume
                  ? "Upload resume to start"
                  : "Start interview"}
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
}: Readonly<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <div className="mb-2.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
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
}: Readonly<{
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}>) {
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
