"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Recorder } from "@/components/interview/Recorder";
import { store } from "@/lib/store";
import {
  buildInterviewPlan,
  buildInterviewPlanWithAI,
  generateReportWithAI,
  maybeGenerateFollowUpWithAI,
  shouldEndInterviewWithAI,
  type AnswerRecord,
  type InterviewConfig,
  type InterviewQuestion,
} from "@/lib/question-engine";
import { cancelSpeech, ensureVoicesLoaded, isTTSSupported, speak } from "@/lib/tts";
import { cn, secondsToClock } from "@/lib/utils";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  ListChecks,
  Lightbulb,
  ArrowLeft,
  BrainCircuit,
  Volume2,
  VolumeX,
} from "lucide-react";

const InterviewerAvatar = dynamic(
  () => import("@/components/interview/InterviewerAvatar").then((m) => m.InterviewerAvatar),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#ede9fe] to-[#c7d2fe] text-xs text-ink-500">
        Loading interviewer…
      </div>
    ),
  },
);

export default function InterviewSessionPage() {
  const router = useRouter();

  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [queue, setQueue] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [aiInserted, setAiInserted] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [aiLive, setAiLive] = useState(false);
  const [planning, setPlanning] = useState(true);
  const [hasStarted, setHasStarted] = useState(true);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);
  const sessionStart = useRef(Date.now());
  const spokenForId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const user = store.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const cfg = store.getConfig();
    if (!cfg) {
      router.replace("/interview/setup");
      return;
    }
    const resumeName = cfg.resume?.candidateName?.trim();
    setCandidateName(resumeName || user.name || "Candidate");
    setConfig(cfg);
    sessionStart.current = Date.now();
    setAiLive(Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY));

    (async () => {
      await ensureVoicesLoaded();
      const plan = await buildInterviewPlanWithAI(cfg);
      if (cancelled) return;
      setQueue(plan.length ? plan : buildInterviewPlan(cfg));
      setPlanning(false);
    })();

    return () => {
      cancelled = true;
      cancelSpeech();
    };
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.round((Date.now() - sessionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const question = queue[current];
  const total = queue.length;
  const progress = total ? Math.round((current / total) * 100) : 0;

  const interviewer = useMemo(
    () => ({
      name: "Ava Reynolds",
      title: `${config?.role ?? "Senior"} Interviewer`,
    }),
    [config?.role],
  );

  // Speak the question whenever it changes
  useEffect(() => {
    if (!question) return;
    if (!hasStarted) return;
    if (!ttsEnabled) return;
    if (!isTTSSupported()) return;
    if (spokenForId.current === question.id) return;
    spokenForId.current = question.id;
    setSpeaking(true);
    const spokenPrompt = acknowledgement
      ? `${acknowledgement} ${question.text}`
      : question.text;
    speak(spokenPrompt, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
    return () => cancelSpeech();
  }, [acknowledgement, hasStarted, question, ttsEnabled]);

  useEffect(() => {
    if (!question) return;
    if (!hasStarted) return;
    if (!ttsEnabled) return;
    if (!isTTSSupported()) return;
    if (current !== 0) return;
    if (spokenForId.current === question.id) return;
    spokenForId.current = question.id;
    void speakWithAwait(
      `Good to meet you, ${candidateName}. Thank you for joining today. Let's begin. ${question.text}`,
    );
  }, [candidateName, current, hasStarted, question, ttsEnabled]);

  function replaySpeech() {
    if (!question) return;
    cancelSpeech();
    setSpeaking(true);
    const spokenPrompt = acknowledgement
      ? `${acknowledgement} ${question.text}`
      : question.text;
    speak(spokenPrompt, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  function toggleTTS() {
    if (ttsEnabled) {
      cancelSpeech();
      setSpeaking(false);
    }
    setTtsEnabled((v) => !v);
  }

  async function handleSubmit({
    transcript,
    durationSec,
    mode,
  }: {
    transcript: string;
    durationSec: number;
    mode: "voice" | "text";
  }) {
    if (!question || !config) return;
    cancelSpeech();
    setSpeaking(false);

    const record: AnswerRecord = {
      questionId: question.id,
      question: question.text,
      category: question.category,
      source: question.source,
      transcript,
      durationSec,
      mode,
    };
    const nextAnswers = [...answers, record];
    setAnswers(nextAnswers);

    setGenerating(true);
    const follow = await maybeGenerateFollowUpWithAI(
      config,
      question,
      transcript,
      aiInserted,
      answers,
    );
    let nextQueue = queue;
    if (follow) {
      nextQueue = [
        ...queue.slice(0, current + 1),
        follow,
        ...queue.slice(current + 1),
      ];
      setQueue(nextQueue);
      setAiInserted((n) => n + 1);
    }
    setGenerating(false);
    const nextIndex = current + 1;
    const stopDecision = await shouldEndInterviewWithAI({
      config,
      answers: nextAnswers,
      nextQuestionPreview: nextQueue[nextIndex]?.text,
    });
    if (stopDecision.shouldEnd || nextIndex >= nextQueue.length) {
      await finalizeSession(nextAnswers);
    } else {
      setAcknowledgement(buildProfessionalAcknowledgement(transcript));
      setCurrent(nextIndex);
    }
  }

  async function finalizeSession(allAnswers: AnswerRecord[]) {
    if (!config) return;
    cancelSpeech();
    setSpeaking(false);
    setFinishing(true);
    if (ttsEnabled && isTTSSupported()) {
      await speakWithAwait(
        `Thank you for your time today, ${candidateName}. That concludes the interview. I'm now generating your report.`,
      );
    }
    const user = store.getUser();
    const report = await generateReportWithAI(
      config,
      { name: user?.name ?? "Candidate", email: user?.email ?? "candidate@hiro.demo" },
      allAnswers,
    );
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ report }),
      });
    } catch (err) {
      console.error("[reports/save]", err);
      store.saveReport(report);
    }
    router.replace(`/interview/${report.id}/report`);
  }

  if (!config) return null;

  if (planning || !question) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/50">
        <div className="text-center">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-ink-200 border-t-ink-900" />
          <p className="mt-4 text-sm font-medium text-ink-900">
            Reading your resume and drafting the interview…
          </p>
          <p className="mt-1 text-xs text-ink-500">
            This usually takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="container flex h-16 max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden text-sm text-ink-500 sm:inline">
              {config.role} · {config.level}
              {config.difficulty ? ` · ${config.difficulty}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="neutral">
              <Clock className="size-3" /> {secondsToClock(elapsed)}
            </Badge>
            <Badge tone="accent" dot>
              {current + 1} of {total}
            </Badge>
            <Badge tone={aiLive ? "success" : "warn"} dot>
              <BrainCircuit className="size-3" />
              {aiLive ? "Dynamic flow enabled" : "Interview flow enabled"}
            </Badge>
            {config.stressTest && (
              <Badge tone="warn" dot>
                Stress test
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("End this session? Your progress will be discarded."))
                  router.push("/dashboard");
              }}
              leftIcon={<ArrowLeft className="size-4" />}
            >
              Exit
            </Button>
          </div>
        </div>
        <div className="h-1 w-full bg-ink-100">
          <div
            className="h-full bg-ink-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              <div className="grid gap-0 md:grid-cols-[260px,1fr]">
                <div className="relative h-[320px] bg-[#ede9fe] md:h-auto">
                  <InterviewerAvatar
                    speaking={speaking}
                    mood={config.interviewerStyle ?? "balanced"}
                    className="absolute inset-0"
                  />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-xl bg-white/85 px-3 py-2 text-[11px] backdrop-blur">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink-900">
                        {interviewer.name}
                      </p>
                      <p className="truncate text-ink-500">
                        {interviewer.title}
                      </p>
                    </div>
                    <button
                      onClick={toggleTTS}
                      className={cn(
                        "inline-flex size-7 flex-none items-center justify-center rounded-full border",
                        ttsEnabled
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-ink-200 bg-white text-ink-500",
                      )}
                      title={ttsEnabled ? "Mute interviewer" : "Unmute interviewer"}
                    >
                      {ttsEnabled ? (
                        <Volume2 className="size-3.5" />
                      ) : (
                        <VolumeX className="size-3.5" />
                      )}
                    </button>
                  </div>
                  {speaking && (
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                      <span className="size-1.5 animate-pulse rounded-full bg-success-400" />
                      Speaking
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-ink-500">
                      {config.interviewerStyle
                        ? `${config.interviewerStyle}`
                        : "balanced"}
                      {config.companyTarget ? ` · ${config.companyTarget}` : ""}
                      {config.difficulty ? ` · ${config.difficulty}` : ""}
                    </p>
                    <Badge
                      tone={question.source === "ai-generated" ? "accent" : "neutral"}
                      dot
                    >
                      {question.source === "ai-generated"
                        ? question.category === "follow-up"
                          ? "Dynamic follow-up"
                          : "Dynamic question"
                        : labelFor(question.category)}
                    </Badge>
                  </div>
                  {hasStarted && acknowledgement && (
                    <p className="rounded-lg border border-success-200 bg-success-50/50 px-3 py-2 text-sm text-ink-700">
                      {acknowledgement}
                    </p>
                  )}
                  <p className="text-xl font-medium leading-8 text-ink-900 sm:text-2xl">
                    {question.text}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <p className="text-xs text-ink-500">
                      Suggested length: ~
                      {Math.round(question.expectedDurationSec / 60)} min
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Volume2 className="size-3.5" />}
                      onClick={replaySpeech}
                      disabled={!ttsEnabled}
                    >
                      Replay
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Recorder
              onSubmit={handleSubmit}
              disabled={!hasStarted || generating || finishing}
            />

            {(generating || finishing) && (
              <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600 animate-fade-in">
                <span className="size-4 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900" />
                {finishing
                  ? "Generating your scored report…"
                  : "Hiro is preparing your next question…"}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <SidebarCard
              title="Session"
              icon={<ListChecks className="size-4" />}
            >
              <ul className="space-y-2">
                {queue.map((q, i) => (
                  <li
                    key={q.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs",
                      i === current && "bg-ink-50 text-ink-900",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 inline-flex size-4 flex-none items-center justify-center rounded-full",
                        i < current
                          ? "bg-success-500 text-white"
                          : i === current
                            ? "border border-ink-900 bg-white text-ink-900"
                            : "border border-ink-200 bg-white text-ink-400",
                      )}
                    >
                      {i < current ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <span className="text-[9px] font-semibold">{i + 1}</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "line-clamp-2",
                        i < current ? "text-ink-500" : "text-ink-700",
                      )}
                    >
                      {q.text}
                    </span>
                    {q.source === "ai-generated" && (
                      <Sparkles className="ml-auto mt-0.5 size-3 flex-none text-accent-500" />
                    )}
                  </li>
                ))}
              </ul>
            </SidebarCard>

            <SidebarCard title="Coach tips" icon={<Lightbulb className="size-4" />}>
              <ul className="space-y-2 text-xs leading-5 text-ink-600">
                <li>Lead with a one-sentence headline before the context.</li>
                <li>Use the STAR pattern for behavioral questions.</li>
                <li>Name at least one trade-off - it shows seniority.</li>
                <li>If you're stuck, say so out loud and reason through it.</li>
              </ul>
            </SidebarCard>

            <button
              onClick={() => {
                void finalizeSession(answers);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-ink-200 bg-white px-4 py-3 text-sm text-ink-600 hover:border-ink-300 hover:bg-ink-50"
            >
              <span>End early & generate report</span>
              <ChevronRight className="size-4" />
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function buildProfessionalAcknowledgement(answer: string) {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const lower = answer.toLowerCase();
  const hasMetrics =
    /\d/.test(lower) ||
    lower.includes("percent") ||
    lower.includes("kpi") ||
    lower.includes("metric");

  if (hasMetrics) {
    const options = [
      "Strong response. The quantified impact was clear.",
      "Well articulated. The metrics strengthened your example.",
      "Good framing. You backed your approach with measurable outcomes.",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  if (wordCount >= 80) {
    const options = [
      "Good depth there. Thank you for walking through your reasoning.",
      "Solid answer. Your ownership and thought process came through clearly.",
      "Well explained. That was a comprehensive response.",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }
  const options = [
    "Thanks, that is helpful context.",
    "Understood, that is a clear response.",
    "Good answer. Let's build on that.",
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function speakWithAwait(text: string) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    speak(text, {
      onStart: () => undefined,
      onEnd: finish,
      onError: finish,
    });
    setTimeout(finish, 6500);
  });
}

function SidebarCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
        <span className="inline-flex size-6 items-center justify-center rounded-md bg-ink-100 text-ink-700">
          {icon}
        </span>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function labelFor(c: InterviewQuestion["category"]) {
  switch (c) {
    case "intro":
      return "Intro";
    case "behavioral":
      return "Behavioral";
    case "technical":
      return "Technical";
    case "wrap":
      return "Wrap-up";
    case "resume-deep-dive":
      return "Resume";
    default:
      return "Question";
  }
}
