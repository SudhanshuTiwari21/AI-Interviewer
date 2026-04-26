"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import type { InterviewReport } from "@/lib/question-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Activity,
  CalendarClock,
  DollarSign,
  TrendingUp,
  Users,
  ArrowUpRight,
  ListChecks,
  ShieldCheck,
  GraduationCap,
  Settings,
} from "lucide-react";

const PRICE = 299;

type CoachingBooking = {
  id: string;
  coachName: string;
  techArea: string;
  startsAt: string;
};

export default function AdminOverviewPage() {
  const { user, has } = useAdmin();
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [bookings, setBookings] = useState<CoachingBooking[]>([]);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
    void fetch("/api/coaching/bookings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBookings(d.bookings);
      });
  }, []);

  const allSessions = reports.map((r) => ({
      id: r.id,
      role: r.role,
      level: r.level,
      candidate: r.candidate,
      status: "completed" as const,
      score: r.overall,
      durationMin: r.durationMin,
      startedAt: r.generatedAt,
    }));

  const completed = allSessions.filter((s) => s.status === "completed");
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, x) => s + x.score, 0) / completed.length)
    : 0;
  const revenue = allSessions.length * PRICE;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Snapshot of platform activity in the last 7 days."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          value={formatCurrency(revenue, "INR")}
          delta="+24%"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          permission={has("users.view")}
          href="/admin/users"
          icon={Users}
          label="Manage users"
          description="Search, suspend, change roles."
        />
        <QuickAction
          permission={has("team.view")}
          href="/admin/team"
          icon={ShieldCheck}
          label="Admin team"
          description="Invite admins & sub-admins."
        />
        <QuickAction
          permission={has("coaches.view")}
          href="/admin/coaches"
          icon={GraduationCap}
          label="Coach roster"
          description="CRUD coaches & availability."
        />
        <QuickAction
          permission={has("settings.view")}
          href="/admin/settings"
          icon={Settings}
          label="Platform settings"
          description="Pricing, banners, maintenance."
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <p className="text-sm font-semibold text-ink-900">Recent sessions</p>
            <Badge tone="neutral" dot>
              Live
            </Badge>
          </div>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
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
                            <p className="font-medium text-ink-900">{s.candidate}</p>
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
                              : "neutral"
                          }
                          dot
                        >
                          {s.status}
                        </Badge>
                      </Td>
                      <Td>
                        {s.status === "completed" ? (
                          <span className="font-semibold text-ink-900">{s.score}</span>
                        ) : (
                          <span className="text-ink-400">-</span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-500">{formatDate(s.startedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="border-b border-ink-100 px-5 py-3">
              <p className="text-sm font-semibold text-ink-900">Score distribution</p>
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
                  <Progress
                    value={value as number}
                    tone={tone as "success" | "accent" | "warn" | "danger"}
                  />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <div className="border-b border-ink-100 px-5 py-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <ListChecks className="size-4" /> Pipeline
              </p>
            </div>
            <CardBody>
              <ul className="space-y-3 text-sm">
                {[
                  ["Sign-ups (today)", 47],
                  ["Paid checkouts", 19],
                  ["Mock interviews started", 24],
                  ["Coaching booked", bookings.length || 8],
                ].map(([label, value]) => (
                  <li
                    key={label as string}
                    className="flex items-center justify-between"
                  >
                    <span className="text-ink-600">{label}</span>
                    <span className="font-semibold text-ink-900">{value}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <div className="border-b border-ink-100 px-5 py-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
                <CalendarClock className="size-4" /> Upcoming bookings
              </p>
            </div>
            <CardBody>
              {bookings.length === 0 ? (
                <p className="text-sm text-ink-500">
                  No upcoming bookings yet. New coaching sessions will appear here.
                </p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {bookings.slice(0, 3).map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {b.coachName}
                        </p>
                        <p className="truncate text-xs text-ink-500">{b.techArea} coaching</p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-500">
                        {formatDate(b.startsAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
}: Readonly<{
  icon: typeof Users;
  label: string;
  value: string;
  delta: string;
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
          <p className="text-[11px] text-success-600">{delta}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function QuickAction({
  permission,
  href,
  icon: Icon,
  label,
  description,
}: Readonly<{
  permission: boolean;
  href: string;
  icon: typeof Users;
  label: string;
  description: string;
}>) {
  if (!permission) return null;
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-xl border border-ink-200 bg-white p-4 transition hover:border-ink-300 hover:bg-ink-50/60"
    >
      <div>
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
          <Icon className="size-4" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
      <ArrowUpRight className="size-4 text-ink-400 transition group-hover:text-ink-700" />
    </Link>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-5 py-3 text-left font-medium uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: Readonly<{
  children?: React.ReactNode;
  className?: string;
}>) {
  return (
    <td className={`px-5 py-4 align-middle text-ink-700 ${className ?? ""}`}>
      {children}
    </td>
  );
}
