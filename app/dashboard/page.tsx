"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { store, type User } from "@/lib/store";
import {
  coachingCredits,
  premiumPlanFeatures,
  INTERVIEW_PRICE_INR,
} from "@/lib/plan-access";
import type { InterviewReport } from "@/lib/question-engine";
import { formatDate } from "@/lib/utils";
import {
  ArrowRight,
  Mic,
  Sparkles,
  CalendarClock,
  TrendingUp,
  Crown,
} from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<InterviewReport[]>([]);

  useEffect(() => {
    const u = store.getUser();
    setUser(u);
    setReports(store.getReports());
  }, []);

  const lastReport = reports[0];
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.overall, 0) / reports.length)
    : 0;
  const userFirstName = user ? user.name.split(" ")[0] : null;

  return (
    <div className="container max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        title={userFirstName ? `Welcome back, ${userFirstName}.` : "Welcome back."}
        description="Pick up where you left off or run a new mock interview."
        actions={
          <>
            <Button href="/schedule" variant="outline">
              Book a coach
            </Button>
            <Button
              href="/interview/setup"
              leftIcon={<Mic className="size-4" />}
            >
              New interview
            </Button>
          </>
        }
      />
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
        <Crown className="size-3.5" />
        All premium interview features are enabled for every interview.
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Price per interview"
          value={`₹${INTERVIEW_PRICE_INR}`}
          delta="Flat fee, no subscription plans"
          icon={Mic}
        />
        <Stat
          label="Average score"
          value={reports.length ? `${avgScore}` : "-"}
          delta={reports.length ? "+6 vs last" : "Run your first"}
          icon={TrendingUp}
        />
        <Stat
          label="Coaching credits"
          value={coachingCredits()}
          delta="Included per completed interview"
          icon={CalendarClock}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent reports</CardTitle>
            <Link
              href="/dashboard/reports"
              className="text-xs font-medium text-ink-600 hover:text-ink-900"
            >
              View all →
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {reports.length === 0 ? (
              <EmptyReports />
            ) : (
              <ul className="divide-y divide-ink-100">
                {reports.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-ink-50/60 sm:gap-4 sm:px-6"
                  >
                    <div className="hidden size-10 flex-none items-center justify-center rounded-xl bg-ink-100 text-ink-700 sm:flex">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {r.role} · {r.level}
                      </p>
                      <p className="text-xs text-ink-500">
                        {formatDate(r.generatedAt)} · {r.durationMin} min ·{" "}
                        {r.perQuestion.length} questions
                      </p>
                    </div>
                    <div className="hidden w-32 sm:block">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-ink-500">Score</span>
                        <span className="font-semibold text-ink-900">
                          {r.overall}
                        </span>
                      </div>
                      <Progress
                        value={r.overall}
                        tone={
                          r.overall >= 80
                            ? "success"
                            : r.overall >= 65
                              ? "accent"
                              : "warn"
                        }
                      />
                    </div>
                    <div className="hidden sm:block">
                      <Badge
                        tone={
                          r.rating === "Strong hire"
                            ? "success"
                            : r.rating === "Hire"
                              ? "accent"
                              : r.rating === "Lean hire"
                                ? "warn"
                                : "danger"
                        }
                        dot
                      >
                        {r.rating}
                      </Badge>
                    </div>
                    <span className="text-xs font-medium text-ink-700 sm:hidden">
                      {r.overall}
                    </span>
                    <Link
                      href={`/interview/${r.id}/report`}
                      className="ml-2 inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      aria-label="Open report"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Included capabilities</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-xs text-ink-700">
              {premiumPlanFeatures().map((feature) => (
                <p key={feature}>• {feature}</p>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Last performance</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              {lastReport ? (
                Object.entries(lastReport.breakdown).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-ink-600">
                        {k.replace(/([A-Z])/g, " $1")}
                      </span>
                      <span className="font-semibold text-ink-900">{v}</span>
                    </div>
                    <Progress value={v} tone={v >= 80 ? "success" : "accent"} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-500">
                  Run your first interview to see your skill breakdown.
                </p>
              )}
            </CardBody>
          </Card>
          <Card className="overflow-hidden bg-ink-950 text-white">
            <CardBody className="relative">
              <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.06]" />
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-300">
                  Coaching
                </p>
                <p className="mt-2 text-base font-semibold">
                  Book your 1-hour coaching call
                </p>
                <p className="mt-1 text-xs text-ink-300">
                  Pair the AI with a human coach. Calendar invite sent
                  instantly.
                </p>
                <Button
                  href="/schedule"
                  size="sm"
                  className="mt-4 bg-white text-ink-900 hover:bg-ink-100"
                >
                  Find a time
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  icon: Icon,
}: Readonly<{
  label: string;
  value: string;
  delta: string;
  icon: any;
}>) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-ink-500">{label}</p>
          <p className="text-2xl font-semibold text-ink-900">{value}</p>
          <p className="text-[11px] text-ink-400">{delta}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyReports() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-700">
        <Sparkles className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink-900">
          No interviews yet
        </p>
        <p className="mt-1 text-sm text-ink-500">
          Run your first mock to see scored feedback here.
        </p>
      </div>
      <Button
        href="/interview/setup"
        size="sm"
        leftIcon={<Mic className="size-4" />}
      >
        Start interview
      </Button>
    </div>
  );
}
