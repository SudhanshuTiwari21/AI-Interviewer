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
import type { InterviewReport } from "@/lib/question-engine";
import { downloadReportPdf } from "@/lib/pdf";
import { formatDate, formatTime } from "@/lib/utils";
import { DEFAULT_COACHING_SESSION_MINUTES } from "@/lib/coaching/constants";
import {
  Download,
  Mail,
  Share2,
  Copy,
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
} from "lucide-react";

type ReportProgress = {
  trend: "improving" | "stable" | "declining" | "insufficient_data";
  totalInterviews: number;
  rollingAvg3: number;
  deltaFromPrevious: {
    overall: number;
  } | null;
  deltaFromFirst: {
    overall: number;
  } | null;
};

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ReportProgress | null>(null);
  const [shareText, setShareText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/reports/${params.id}`, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.ok && data.report) {
          setReport(data.report);
          return;
        }
      } catch {
        // fallback below
      }
      const local = store.getReport(params.id);
      if (!local) {
        router.replace("/dashboard/reports");
        return;
      }
      setReport(local);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  useEffect(() => {
    if (!report) return;
    void fetch(`/api/reports/progress?currentId=${encodeURIComponent(report.id)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setProgress(d.progress);
      });
  }, [report]);

  useEffect(() => {
    if (!report || shareText.trim().length > 0) return;
    setShareText(buildShareTemplate(report, progress));
  }, [progress, report, shareText]);

  if (!report) return null;

  const fallbackReportUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/interview/${params.id}/report`;
  const reportUrl =
    globalThis.window === undefined
      ? fallbackReportUrl
      : globalThis.window.location.href;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedReportUrl = encodeURIComponent(reportUrl);
  const shareWithLink = `${shareText}\n\n${reportUrl}`;
  const encodedShareWithLink = encodeURIComponent(shareWithLink);
  const emailSubject = encodeURIComponent("My SelectWise interview report");
  const emailBody = encodedShareWithLink;
  const socialShareLinks = [
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodedShareWithLink}`,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedReportUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedShareWithLink}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedReportUrl}&quote=${encodedShareText}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedReportUrl}&text=${encodedShareText}`,
    },
  ];

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
              loading={false}
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
            Report emailed to <strong>{report.email}</strong> and to the Selectwise
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
                      Selectwise Interview Report
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

            {progress && (
              <Card>
                <div className="border-b border-ink-100 px-6 py-4">
                  <p className="text-sm font-semibold text-ink-900">
                    Progress vs previous interviews
                  </p>
                </div>
                <CardBody className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                    <p className="text-xs text-ink-500">Trend</p>
                    <p className="mt-1 text-base font-semibold capitalize text-ink-900">
                      {progress.trend.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Based on your latest two interviews.
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                    <p className="text-xs text-ink-500">Delta from previous</p>
                    <p className="mt-1 text-base font-semibold text-ink-900">
                      {formatSigned(progress.deltaFromPrevious?.overall)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Overall score change.
                    </p>
                  </div>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                    <p className="text-xs text-ink-500">Rolling average (last 3)</p>
                    <p className="mt-1 text-base font-semibold text-ink-900">
                      {progress.rollingAvg3}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Across {Math.min(3, progress.totalInterviews)} interview(s).
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

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

            {report.detailedAnalysis && (
              <Card>
                <div className="border-b border-ink-100 px-6 py-4">
                  <p className="text-sm font-semibold text-ink-900">
                    Detailed analysis
                  </p>
                </div>
                <CardBody className="space-y-4">
                  <InsightBlock title="Executive summary" text={report.detailedAnalysis.executiveSummary} />
                  <InsightBlock title="Interview behavior" text={report.detailedAnalysis.interviewBehavior} />
                  <InsightBlock title="Technical signals" text={report.detailedAnalysis.technicalSignals} />
                  <InsightBlock title="Communication signals" text={report.detailedAnalysis.communicationSignals} />
                  <InsightBlock title="Risk assessment" text={report.detailedAnalysis.riskAssessment} />
                  <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                      7-day improvement plan
                    </p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-700">
                      {report.detailedAnalysis.sevenDayPlan.map((step) => (
                        <li key={step} className="flex items-start gap-2">
                          <span className="mt-2 inline-block size-1.5 flex-none rounded-full bg-accent-500" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
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
              </CardBody>
            </Card>
          </div>

          <aside className="space-y-4">
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
                  Included with every interview.
                </p>
              </CardBody>
            </Card>
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

            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Share2 className="size-4 text-accent-600" />
                  Share your result
                </p>
              </div>
              <CardBody className="space-y-3">
                <p className="text-xs text-ink-500">
                  Edit this template and share your experience with one click.
                </p>
                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 outline-none ring-accent-500/25 transition focus:ring"
                />
                <div className="flex flex-wrap gap-2">
                  {socialShareLinks.map((item) => (
                    <Button
                      key={item.label}
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(item.href, "_blank", "noopener,noreferrer")}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Copy className="size-4" />}
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareWithLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                  >
                    {copied ? "Copied" : "Copy text + report link"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                  >
                    Share via Email
                  </Button>
                </div>
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
                    Book a {DEFAULT_COACHING_SESSION_MINUTES}-minute deep dive with a coach
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

            <Link
              href="/dashboard/reports"
              className="inline-block text-xs text-ink-700 underline"
            >
              Back to all reports
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

function buildShareTemplate(report: InterviewReport, progress: ReportProgress | null) {
  const durationLabel = `${report.durationMin} minute${report.durationMin === 1 ? "" : "s"}`;
  const strengths = report.strengths.slice(0, 3);
  const improvements = report.improvements.slice(0, 3);
  const trendLabel = progress?.trend ? progress.trend.replaceAll("_", " ") : "insufficient data";
  const previousDelta = formatSigned(progress?.deltaFromPrevious?.overall);
  const trendLine =
    previousDelta === "N/A" ? trendLabel : `${trendLabel} (${previousDelta} vs previous)`;

  return `Selectwise Interview Report
${report.role} · ${report.level}
Candidate ${report.candidate} · ${formatDate(report.generatedAt)} at ${formatTime(report.generatedAt)} · ${durationLabel}

🎯 Score
${report.overall}/100

🧭 Recommendation
${report.rating}

✅ Strengths
${strengths.length > 0 ? strengths.map((s) => `- ${s}`).join("\n") : "- No strengths captured in this report."}

🛠️ Areas to improve
${improvements.length > 0 ? improvements.map((s) => `- ${s}`).join("\n") : "- No improvement areas captured in this report."}

📈 Trend
${trendLine}`;
}

function formatSigned(value: number | undefined) {
  if (typeof value !== "number") return "N/A";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : `${value}`;
}

function Section({
  title,
  icon,
  children,
}: Readonly<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}>) {
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

function InsightBlock({ title, text }: Readonly<{ title: string; text: string }>) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-ink-700">{text}</p>
    </div>
  );
}
