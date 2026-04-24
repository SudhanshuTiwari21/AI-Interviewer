"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Recorder } from "@/components/interview/Recorder";
import { store } from "@/lib/store";
import {
  buildInterviewPlan,
  generateReportWithAI,
  maybeGenerateFollowUpWithAI,
  type AnswerRecord,
  type InterviewConfig,
  type InterviewQuestion,
} from "@/lib/question-engine";
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
} from "lucide-react";

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
  const sessionStart = useRef(Date.now());

  useEffect(() => {
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
    setConfig(cfg);
    setQueue(buildInterviewPlan(cfg));
    sessionStart.current = Date.now();
    setAiLive(Boolean(process.env.NEXT_PUBLIC_OPENAI_API_KEY));
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
      name: "Avery Stone",
      title: `${config?.role ?? "Senior"} Interviewer`,
    }),
    [config?.role],
  );

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
    if (nextIndex >= nextQueue.length) {
      await finalizeSession(nextAnswers);
    } else {
      setCurrent(nextIndex);
    }
  }

  async function finalizeSession(allAnswers: AnswerRecord[]) {
    if (!config) return;
    setFinishing(true);
    const user = store.getUser();
    const report = await generateReportWithAI(
      config,
      { name: user?.name ?? "Candidate", email: user?.email ?? "candidate@apex.demo" },
      allAnswers,
    );
    store.saveReport(report);
    router.replace(`/interview/${report.id}/report`);
  }

  if (!config || !question) return null;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
        <div className="container flex h-16 max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden text-sm text-ink-500 sm:inline">
              {config.role} · {config.level}
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
              {aiLive ? "OpenAI connected" : "OpenAI fallback"}
            </Badge>
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
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <Avatar name={interviewer.name} />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {interviewer.name}
                      </p>
                      <p className="text-xs text-ink-500">{interviewer.title}</p>
                    </div>
                    <Badge
                      tone={question.source === "ai-generated" ? "accent" : "neutral"}
                      dot
                    >
                      {question.source === "ai-generated"
                        ? "AI follow-up"
                        : labelFor(question.category)}
                    </Badge>
                  </div>
                  <p className="mt-5 text-xl font-medium leading-8 text-ink-900 sm:text-2xl">
                    {question.text}
                  </p>
                  <p className="mt-3 text-xs text-ink-500">
                    Suggested length: ~
                    {Math.round(question.expectedDurationSec / 60)} min
                  </p>
                </div>
              </div>
            </div>

            <Recorder onSubmit={handleSubmit} disabled={generating || finishing} />

            {(generating || finishing) && (
              <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-600 animate-fade-in">
                <span className="size-4 animate-spin rounded-full border-2 border-ink-300 border-t-ink-900" />
                {finishing
                  ? "Generating your scored report…"
                  : "Apex is preparing your next question…"}
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
                <li>Name at least one trade-off — it shows seniority.</li>
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
    default:
      return "Question";
  }
}
