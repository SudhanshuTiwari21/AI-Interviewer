"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { store } from "@/lib/store";
import { RECENT_SESSIONS } from "@/lib/mock-data";
import type { InterviewReport } from "@/lib/question-engine";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Activity,
  ListChecks,
  TrendingUp,
} from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [reports, setReports] = useState<InterviewReport[]>([]);

  useEffect(() => {
    const user = store.getUser();
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setReports(store.getReports());
  }, [router]);

  const allSessions = [
    ...reports.map((r) => ({
      id: r.id,
      role: r.role,
      level: r.level,
      candidate: r.candidate,
      status: "completed" as const,
      score: r.overall,
      durationMin: r.durationMin,
      startedAt: r.generatedAt,
    })),
    ...RECENT_SESSIONS,
  ];

  const completed = allSessions.filter((s) => s.status === "completed");
  const avgScore = completed.length
    ? Math.round(
        completed.reduce((s, x) => s + x.score, 0) / completed.length,
      )
    : 0;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge tone="accent" dot>
              Admin
            </Badge>
          </div>
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
          >
            Back
          </Button>
        </div>
      </header>
      <main className="container max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Operations
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Snapshot of platform activity in the last 7 days.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Users}
            label="Active candidates"
            value={String(allSessions.length)}
            delta="+12% WoW"
          />
          <Stat
            icon={Activity}
            label="Sessions run"
            value={String(allSessions.length)}
            delta="+18% WoW"
          />
          <Stat
            icon={TrendingUp}
            label="Avg score"
            value={String(avgScore || "-")}
            delta="+3 pts"
          />
          <Stat
            icon={DollarSign}
            label="Revenue (week)"
            value={formatCurrency(allSessions.length * 79)}
            delta="+24%"
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <Card>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <p className="text-sm font-semibold text-ink-900">
                Recent sessions
              </p>
              <Badge tone="neutral" dot>
                Live
              </Badge>
            </div>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500">
                  <tr className="border-b border-ink-100">
                    <Th>Candidate</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Score</Th>
                    <Th>Started</Th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.slice(0, 8).map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.candidate} size="sm" />
                          <div>
                            <p className="font-medium text-ink-900">
                              {s.candidate}
                            </p>
                            <p className="text-xs text-ink-500">{s.id}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {s.role}
                        <p className="text-xs text-ink-500">{s.level}</p>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            s.status === "completed"
                              ? "success"
                              : s.status === "in-progress"
                                ? "accent"
                                : "neutral"
                          }
                          dot
                        >
                          {s.status}
                        </Badge>
                      </Td>
                      <Td>
                        {s.status === "completed" ? (
                          <span className="font-semibold text-ink-900">
                            {s.score}
                          </span>
                        ) : (
                          <span className="text-ink-400">-</span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-500">
                        {formatDate(s.startedAt)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  Score distribution
                </p>
              </div>
              <CardBody className="space-y-3">
                {[
                  ["Strong hire", "success", 18],
                  ["Hire", "accent", 42],
                  ["Lean hire", "warn", 26],
                  ["No hire", "danger", 14],
                ].map(([label, tone, value]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-ink-700">{label}</span>
                      <span className="font-medium text-ink-900">{value}%</span>
                    </div>
                    <Progress value={value as number} tone={tone as any} />
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900 inline-flex items-center gap-2">
                  <ListChecks className="size-4" /> Pipeline
                </p>
              </div>
              <CardBody>
                <ul className="space-y-3 text-sm">
                  {[
                    ["Sign-ups (today)", 47],
                    ["Paid checkouts", 19],
                    ["Mock interviews started", 24],
                    ["Coaching booked", 8],
                  ].map(([label, value]) => (
                    <li
                      key={label as string}
                      className="flex items-center justify-between"
                    >
                      <span className="text-ink-600">{label}</span>
                      <span className="font-semibold text-ink-900">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: any;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-ink-500">{label}</p>
          <p className="text-2xl font-semibold text-ink-900">{value}</p>
          <p className="text-[11px] text-success-600">{delta}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left font-medium uppercase tracking-wide">
      {children}
    </th>
  );
}
function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-5 py-4 align-middle text-ink-700 ${className ?? ""}`}>
      {children}
    </td>
  );
}
