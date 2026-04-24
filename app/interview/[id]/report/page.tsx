"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { store } from "@/lib/store";
import { canUsePremiumControls, normalizePlan, type DemoPlan } from "@/lib/plan-access";
import type { InterviewReport } from "@/lib/question-engine";
import { downloadReportPdf } from "@/lib/pdf";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Download,
  Mail,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  ListChecks,
  Lightbulb,
  Crown,
  Target,
  AlertTriangle,
  FileCheck2,
  Lock,
} from "lucide-react";

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [plan, setPlan] = useState<DemoPlan>("free");
  const [emailSent, setEmailSent] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const r = store.getReport(params.id);
    if (!r) {
      router.replace("/dashboard/reports");
      return;
    }
    setPlan(normalizePlan(store.getUser()?.plan));
    setReport(r);
  }, [params.id, router]);

  if (!report) return null;
  const hasWeakAreaAccess = plan !== "free";

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button
              href="/dashboard"
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="size-4" />}
            >
              Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={emailSent === false && false}
              onClick={() => {
                setEmailSent(true);
                setTimeout(() => setEmailSent(false), 4000);
              }}
              leftIcon={<Mail className="size-4" />}
            >
              {emailSent ? "Emails sent" : "Email a copy"}
            </Button>
            <Button
              size="sm"
              loading={downloading}
              onClick={async () => {
                setDownloading(true);
                try {
                  await downloadReportPdf(report);
                } finally {
                  setDownloading(false);
                }
              }}
              leftIcon={<Download className="size-4" />}
            >
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-8 sm:py-10">
        {emailSent && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-success-500/30 bg-success-50 px-4 py-3 text-sm text-success-600 animate-fade-in">
            <CheckCircle2 className="size-4" />
            Report emailed to <strong>{report.email}</strong> and to the Apex
            admin.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="relative bg-ink-950 p-6 text-white">
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.06]" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-ink-300">
                      <Sparkles className="size-3.5 text-accent-400" />
                      Apex Interview Report
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {report.role} · {report.level}
                    </h1>
                    <p className="mt-1 text-sm text-ink-300">
                      Candidate {report.candidate} ·{" "}
                      {formatDate(report.generatedAt)} at{" "}
                      {formatTime(report.generatedAt)} ·{" "}
                      {report.durationMin} minutes
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-400">
                        Score
                      </p>
                      <p className="text-5xl font-semibold tracking-tight">
                        {report.overall}
                        <span className="text-base text-ink-400">/100</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-ink-400">
                        Recommendation
                      </p>
                      <Badge
                        tone={
                          report.rating === "Strong hire"
                            ? "success"
                            : report.rating === "Hire"
                              ? "accent"
                              : report.rating === "Lean hire"
                                ? "warn"
                                : "danger"
                        }
                        className="mt-1"
                        dot
                      >
                        {report.rating}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <CardBody>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Section title="Strengths" icon={<TrendingUp className="size-4 text-success-500" />}>
                    <ul className="space-y-2 text-sm leading-6 text-ink-700">
                      {report.strengths.map((s) => (
                        <li key={s} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 flex-none text-success-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section title="Areas to improve" icon={<Lightbulb className="size-4 text-warn-500" />}>
                    <ul className="space-y-2 text-sm leading-6 text-ink-700">
                      {report.improvements.map((s) => (
                        <li key={s} className="flex items-start gap-2">
                          <span className="mt-1 inline-block size-1.5 flex-none rounded-full bg-warn-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Section>
                </div>
              </CardBody>
            </Card>

            {report.jobReadiness && (
              <Card>
                <div className="border-b border-ink-100 px-6 py-4">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Target className="size-4 text-accent-600" /> Job readiness
                  </p>
                </div>
                <CardBody className="space-y-4">
                  {report.jobReadiness.summary && (
                    <p className="text-sm leading-6 text-ink-700">
                      {report.jobReadiness.summary}
                    </p>
                  )}
                  {report.jobReadiness.resumeConsistency && (
                    <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold text-ink-900">
                        <FileCheck2 className="size-3.5 text-success-500" />
                        Resume consistency
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-ink-700">
                        {report.jobReadiness.resumeConsistency}
                      </p>
                    </div>
                  )}
                  {report.jobReadiness.redFlags.length > 0 && (
                    <div className="rounded-xl border border-warn-500/30 bg-warn-50/40 p-4">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold text-ink-900">
                        <AlertTriangle className="size-3.5 text-warn-500" />
                        Red flags to address
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-700">
                        {report.jobReadiness.redFlags.map((r) => (
                          <li key={r} className="flex items-start gap-2">
                            <span className="mt-2 inline-block size-1.5 flex-none rounded-full bg-warn-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            <Card>
              <div className="border-b border-ink-100 px-6 py-4">
                <p className="text-sm font-semibold text-ink-900">
                  Skill breakdown
                </p>
              </div>
              <CardBody className="space-y-4">
                {Object.entries(report.breakdown).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize text-ink-700">
                        {k.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="font-semibold text-ink-900">{v}</span>
                    </div>
                    <Progress
                      value={v}
                      tone={v >= 80 ? "success" : v >= 65 ? "accent" : "warn"}
                    />
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-ink-100 px-6 py-4">
                <p className="text-sm font-semibold text-ink-900">
                  Per-question feedback
                </p>
              </div>
              <CardBody className="space-y-4">
                {report.perQuestion.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-ink-100 bg-ink-50/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-ink-900">
                        Q{i + 1}. {q.question}
                      </p>
                      <Badge tone={q.source === "ai-generated" ? "accent" : "neutral"} dot>
                        {q.source === "ai-generated" ? "Dynamic follow-up" : "Scripted"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr,80px] items-center gap-3">
                      <Progress
                        value={q.score}
                        tone={q.score >= 80 ? "success" : q.score >= 65 ? "accent" : "warn"}
                      />
                      <span className="text-right text-sm font-semibold text-ink-900">
                        {q.score}/100
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ink-500">{q.summary}</p>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-ink-100 px-6 py-4">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <AlertTriangle className="size-4 text-warn-500" />
                  Score drop reasons
                </p>
              </div>
              <CardBody>
                {hasWeakAreaAccess ? (
                  <div className="space-y-3">
                    {report.weakAreas.map((w) => (
                      <div
                        key={`${w.area}-${w.title}`}
                        className="rounded-xl border border-ink-100 bg-ink-50/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-ink-900">{w.title}</p>
                          <Badge tone="warn" dot>
                            -{w.impact} pts
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-ink-700">{w.reason}</p>
                        <p className="mt-2 text-xs text-ink-500">
                          Current score in this area: <span className="font-medium">{w.score}</span>
                        </p>
                        <p className="mt-1 text-xs text-ink-600">
                          Fix: {w.fix}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-5">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                      <Lock className="size-4 text-ink-500" />
                      Premium section locked
                    </p>
                    <p className="mt-2 text-sm text-ink-600">
                      Upgrade to view detailed weak areas and exact reasons your score dropped.
                    </p>
                    <Button href="/checkout?plan=starter" size="sm" className="mt-3">
                      Unlock full report
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <aside className="space-y-4">
            {canUsePremiumControls(plan) && (
              <Card>
                <div className="border-b border-ink-100 px-5 py-3">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Crown className="size-4 text-amber-500" />
                    Premium insights
                  </p>
                </div>
                <CardBody className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                    <span className="text-ink-600">Estimated percentile</span>
                    <span className="font-semibold text-ink-900">
                      Top {Math.max(3, 100 - report.overall)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
                    <span className="text-ink-600">Company-pack readiness</span>
                    <span className="font-semibold text-ink-900">
                      {report.overall >= 80 ? "High" : report.overall >= 65 ? "Medium" : "Needs work"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {plan === "team" ? "Team" : "Pro"} plan includes benchmarked insights and advanced coaching
                    recommendations.
                  </p>
                </CardBody>
              </Card>
            )}
            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900 inline-flex items-center gap-2">
                  <ListChecks className="size-4 text-ink-700" /> Next steps
                </p>
              </div>
              <CardBody>
                <ul className="space-y-3 text-sm leading-6 text-ink-700">
                  {report.nextSteps.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <span className="mt-2 inline-block size-1.5 flex-none rounded-full bg-accent-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="overflow-hidden bg-ink-950 text-white">
              <div className="relative p-5">
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.06]" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-wide text-ink-300">
                    Coaching
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    Book a 1-hour deep dive with a coach
                  </p>
                  <p className="mt-1 text-xs text-ink-300">
                    Drill the gaps surfaced in this report. Calendar invite sent
                    instantly.
                  </p>
                  <Button
                    href={`/schedule?reportId=${report.id}`}
                    size="sm"
                    className="mt-4 bg-white text-ink-900 hover:bg-ink-100"
                    leftIcon={<CalendarClock className="size-4" />}
                  >
                    Schedule a session
                  </Button>
                </div>
              </div>
            </Card>

            <div className="rounded-2xl border border-ink-200 bg-white p-4 text-xs text-ink-500">
              <p className="font-medium text-ink-900">Shared with</p>
              <ul className="mt-2 space-y-1">
                <li>• {report.email} (you)</li>
                <li>• admin@apex.app</li>
              </ul>
              <p className="mt-3">
                Report ID: <span className="font-mono">{report.id}</span>
              </p>
              <Link
                href="/dashboard/reports"
                className="mt-3 inline-block text-ink-700 underline"
              >
                Back to all reports
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
        {icon}
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
