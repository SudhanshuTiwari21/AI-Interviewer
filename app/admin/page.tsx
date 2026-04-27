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
  AlertTriangle,
  Search,
} from "lucide-react";

const PRICE = 299;
type TimeRange = "today" | "week" | "month" | "custom";

type CoachingBooking = {
  id: string;
  coachName: string;
  techArea: string;
  startsAt: string;
  createdAt: string;
};

type AdminUserRow = {
  id: string;
  createdAt: string;
  leadSource: string;
};

type PaymentTransaction = {
  id: string;
  productType: string;
  amountInr: number;
  status: string;
  createdAt: string;
};

export default function AdminOverviewPage() {
  const { user, has } = useAdmin();
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [bookings, setBookings] = useState<CoachingBooking[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [range, setRange] = useState<TimeRange>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");

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
    void fetch("/api/admin/users?page=1&pageSize=500", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUsers(d.users);
      });
    void fetch("/api/admin/payments/transactions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setTransactions(d.transactions);
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
    weakAreas: r.weakAreas,
    hasResume: Boolean(r.jobReadiness?.resumeConsistency),
  }));

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;
  const thirtyDaysMs = 30 * oneDayMs;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const customFromTs = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null;
  const customToTs = customTo ? new Date(`${customTo}T23:59:59`).getTime() : null;

  const rangeStartTs = resolveRangeStart({
    range,
    now,
    startOfTodayMs: startOfToday.getTime(),
    sevenDaysMs,
    thirtyDaysMs,
    customFromTs,
  });

  const rangeEndTs = range === "custom" && customToTs ? customToTs : now;
  const currentWindowMs = Math.max(oneDayMs, rangeEndTs - rangeStartTs);
  const previousWindowStartTs = rangeStartTs - currentWindowMs;
  const previousWindowEndTs = rangeStartTs;

  const currentWeekSessions = allSessions.filter(
    (s) =>
      new Date(s.startedAt).getTime() >= rangeStartTs &&
      new Date(s.startedAt).getTime() <= rangeEndTs,
  );
  const previousWeekSessions = allSessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return t >= previousWindowStartTs && t < previousWindowEndTs;
  });

  const currentWeekActiveCandidates = new Set(
    currentWeekSessions.map((s) => s.candidate.toLowerCase().trim()),
  ).size;
  const previousWeekActiveCandidates = new Set(
    previousWeekSessions.map((s) => s.candidate.toLowerCase().trim()),
  ).size;

  const currentWeekAvgScore = currentWeekSessions.length
    ? Math.round(
        currentWeekSessions.reduce((sum, item) => sum + item.score, 0) /
          currentWeekSessions.length,
      )
    : 0;
  const previousWeekAvgScore = previousWeekSessions.length
    ? Math.round(
        previousWeekSessions.reduce((sum, item) => sum + item.score, 0) /
          previousWeekSessions.length,
      )
    : 0;

  const currentWeekRevenue = currentWeekSessions.length * PRICE;
  const previousWeekRevenue = previousWeekSessions.length * PRICE;
  const ratingBuckets = [
    { label: "Strong hire", tone: "success" as const, count: 0 },
    { label: "Hire", tone: "accent" as const, count: 0 },
    { label: "Lean hire", tone: "warn" as const, count: 0 },
    { label: "No hire", tone: "danger" as const, count: 0 },
  ];
  for (const report of reports) {
    const bucket = ratingBuckets.find((b) => b.label === report.rating);
    if (bucket) bucket.count += 1;
  }
  const ratingTotal = ratingBuckets.reduce((sum, b) => sum + b.count, 0);
  const scoreDistribution = ratingBuckets.map((bucket) => ({
    ...bucket,
    pct: ratingTotal === 0 ? 0 : Math.round((bucket.count / ratingTotal) * 100),
  }));

  const paidStatuses = new Set([
    "paid",
    "refund_requested",
    "refund_pending",
    "partially_refunded",
    "refunded",
  ]);
  const signupsToday = users.filter(
    (u) =>
      new Date(u.createdAt).getTime() >= rangeStartTs &&
      new Date(u.createdAt).getTime() <= rangeEndTs,
  ).length;
  const paidCheckoutsToday = transactions.filter(
    (tx) =>
      new Date(tx.createdAt).getTime() >= rangeStartTs &&
      new Date(tx.createdAt).getTime() <= rangeEndTs &&
      paidStatuses.has(tx.status),
  ).length;
  const mockInterviewsStartedToday = reports.filter(
    (r) =>
      new Date(r.generatedAt).getTime() >= rangeStartTs &&
      new Date(r.generatedAt).getTime() <= rangeEndTs,
  ).length;
  const coachingBookedToday = bookings.filter(
    (b) =>
      new Date(b.createdAt).getTime() >= rangeStartTs &&
      new Date(b.createdAt).getTime() <= rangeEndTs,
  ).length;

  const failedPayments = transactions.filter((tx) => tx.status === "failed").length;
  const refundPending = bookings.filter(
    (b: any) =>
      b.paymentStatus === "refund_requested" ||
      b.paymentStatus === "refund_pending" ||
      b.status === "refund_requested" ||
      b.status === "refund_pending",
  ).length;
  const pendingCoachingConfirmations = bookings.filter((b: any) => b.status === "pending").length;
  const abandonedCheckouts = transactions.filter(
    (tx) => tx.status === "created" && now - new Date(tx.createdAt).getTime() > 30 * 60 * 1000,
  ).length;
  const suspiciousRetries = (() => {
    const buckets = new Map<string, number>();
    for (const tx of transactions) {
      const minute = new Date(tx.createdAt).toISOString().slice(0, 16);
      buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
    }
    return [...buckets.values()].filter((count) => count >= 4).length;
  })();

  const interviewCandidates = new Set(reports.map((r) => r.candidate.toLowerCase().trim())).size;
  const coachingCandidates = new Set(
    bookings.map((b: any) => (b.candidateName ?? "").toLowerCase().trim()).filter(Boolean),
  ).size;
  const interviewToCoachingConversion =
    interviewCandidates > 0 ? Math.round((coachingCandidates / interviewCandidates) * 100) : 0;

  const topConvertingRole = (() => {
    const counts = new Map<string, number>();
    for (const s of currentWeekSessions) {
      counts.set(s.role, (counts.get(s.role) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  })();
  const mostCommonWeakArea = (() => {
    const counts = new Map<string, number>();
    for (const s of currentWeekSessions) {
      for (const weak of s.weakAreas) {
        counts.set(weak.title, (counts.get(weak.title) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  })();
  const bestLeadSource = (() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      const key = (u.leadSource ?? "direct").toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  })();

  const activeCandidatesDelta = formatPercentDelta(
    currentWeekActiveCandidates,
    previousWeekActiveCandidates,
  );
  const sessionsDelta = formatPercentDelta(
    currentWeekSessions.length,
    previousWeekSessions.length,
  );
  const avgScoreDelta = formatPointDelta(currentWeekAvgScore, previousWeekAvgScore);
  const revenueDelta = formatPercentDelta(currentWeekRevenue, previousWeekRevenue);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Snapshot of platform activity with operational and founder signals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5 text-xs">
              {(["today", "week", "month", "custom"] as const).map((item: TimeRange) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-md px-2.5 py-1.5 font-medium ${
                    range === item ? "bg-ink-900 text-white" : "text-ink-600"
                  }`}
                >
                  {rangeLabel(item)}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 rounded-lg border border-ink-200 px-2 text-xs"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 rounded-lg border border-ink-200 px-2 text-xs"
                />
              </div>
            )}
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-ink-200 bg-white p-3">
        <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Search className="size-4" /> Candidate quick search
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={candidateQuery}
            onChange={(e) => setCandidateQuery(e.target.value)}
            placeholder="Search by name / email / interview ID"
            className="h-9 min-w-[280px] flex-1 rounded-lg border border-ink-200 px-3 text-sm"
          />
          <Link href={`/admin/users?q=${encodeURIComponent(candidateQuery.trim())}`}>
            <button className="h-9 rounded-lg bg-ink-900 px-3 text-sm text-white">Search users</button>
          </Link>
          <Link href={`/admin/reports`}>
            <button className="h-9 rounded-lg border border-ink-200 px-3 text-sm text-ink-700">Open reports</button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Active candidates"
          value={String(currentWeekActiveCandidates)}
          delta={activeCandidatesDelta}
        />
        <Stat
          icon={Activity}
          label="Sessions run"
          value={String(currentWeekSessions.length)}
          delta={sessionsDelta}
        />
        <Stat
          icon={TrendingUp}
          label="Avg score (week)"
          value={String(currentWeekAvgScore || "-")}
          delta={avgScoreDelta}
        />
        <Stat
          icon={DollarSign}
          label="Revenue (week)"
          value={formatCurrency(currentWeekRevenue, "INR")}
          delta={revenueDelta}
          emphasize
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr,1fr,1fr]">
        <Card className="border-danger-200 bg-danger-50/30">
          <CardBody>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <AlertTriangle className="size-4 text-danger-600" /> Immediate attention needed
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between"><span>Failed payments</span><strong>{failedPayments}</strong></li>
              <li className="flex justify-between"><span>Refund requests pending</span><strong>{refundPending}</strong></li>
              <li className="flex justify-between"><span>Pending coaching confirmations</span><strong>{pendingCoachingConfirmations}</strong></li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Payment risk view</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-700">
              <li className="flex justify-between"><span>Failed payments</span><strong>{failedPayments}</strong></li>
              <li className="flex justify-between"><span>Abandoned checkouts</span><strong>{abandonedCheckouts}</strong></li>
              <li className="flex justify-between"><span>Refund pending</span><strong>{refundPending}</strong></li>
              <li className="flex justify-between"><span>Suspicious retry windows</span><strong>{suspiciousRetries}</strong></li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Founder snapshot</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-700">
              <li className="flex justify-between"><span>Revenue today</span><strong>{formatCurrency(currentWeekRevenue, "INR")}</strong></li>
              <li className="flex justify-between"><span>Top converting role</span><strong>{topConvertingRole}</strong></li>
              <li className="flex justify-between"><span>Most common weak area</span><strong className="text-right">{mostCommonWeakArea}</strong></li>
              <li className="flex justify-between"><span>Best lead source</span><strong>{bestLeadSource}</strong></li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Coaching conversion</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold text-ink-900">{interviewToCoachingConversion}%</p>
              <p className="text-xs text-ink-500">Interview → Coaching</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Resume upload visibility</p>
            <p className="mt-2 text-sm text-ink-600">
              Visible in recent sessions as uploaded/missing for quick support diagnostics.
            </p>
          </CardBody>
        </Card>
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
                    <Th>Resume</Th>
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
                      <Td>
                        <Badge tone={s.hasResume ? "success" : "warn"} dot>
                          {s.hasResume ? "Uploaded" : "Missing"}
                        </Badge>
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
              {scoreDistribution.map(({ label, tone, pct }) => (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-700">{label}</span>
                    <span className="font-medium text-ink-900">{pct}%</span>
                  </div>
                  <Progress value={pct} tone={tone} />
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
                  ["Sign-ups (today)", signupsToday],
                  ["Paid checkouts (today)", paidCheckoutsToday],
                  ["Mock interviews started (today)", mockInterviewsStartedToday],
                  ["Coaching booked (today)", coachingBookedToday],
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
  emphasize,
}: Readonly<{
  icon: typeof Users;
  label: string;
  value: string;
  delta: string;
  emphasize?: boolean;
}>) {
  const deltaTone = deltaToneClass(delta);
  return (
    <Card className={emphasize ? "border-success-300 bg-success-50/20" : undefined}>
      <CardBody className="flex items-center gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-ink-500">{label}</p>
          <p className="text-2xl font-semibold text-ink-900">{value}</p>
          <p className={`text-[11px] ${deltaTone}`}>{delta}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function resolveRangeStart({
  range,
  now,
  startOfTodayMs,
  sevenDaysMs,
  thirtyDaysMs,
  customFromTs,
}: Readonly<{
  range: TimeRange;
  now: number;
  startOfTodayMs: number;
  sevenDaysMs: number;
  thirtyDaysMs: number;
  customFromTs: number | null;
}>): number {
  if (range === "today") return startOfTodayMs;
  if (range === "week") return now - sevenDaysMs;
  if (range === "month") return now - thirtyDaysMs;
  return customFromTs ?? now - sevenDaysMs;
}

function rangeLabel(range: TimeRange): string {
  if (range === "today") return "Today";
  if (range === "week") return "This Week";
  if (range === "month") return "This Month";
  return "Custom";
}

function deltaToneClass(delta: string): string {
  if (delta.startsWith("+")) return "text-success-600";
  if (delta.startsWith("-")) return "text-danger-600";
  return "text-ink-500";
}

function formatPercentDelta(current: number, previous: number): string {
  if (previous === 0) {
    if (current === 0) return "0% vs previous week";
    return "New this week";
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}% vs previous week`;
}

function formatPointDelta(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "0 pts vs previous week";
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff} pts vs previous week`;
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
