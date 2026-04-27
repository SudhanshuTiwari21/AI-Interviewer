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

type CoachingBooking = {
  id: string;
  coachName: string;
  techArea: string;
  startsAt: string;
  amountInr: number;
  status: string;
  paymentStatus: string;
  refundReason: string | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [bookings, setBookings] = useState<CoachingBooking[]>([]);
  const [refundReasonById, setRefundReasonById] = useState<Record<string, string>>({});
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    const u = store.getUser();
    setUser(u);
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
        else setReports(store.getReports());
      })
      .catch(() => setReports(store.getReports()));
    void fetch("/api/coaching/bookings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBookings(d.bookings);
      });
  }, []);

  async function requestRefund(bookingId: string) {
    const reason = (refundReasonById[bookingId] ?? "").trim();
    if (reason.length < 15) {
      setRefundError("Please provide a proper refund reason (at least 15 characters).");
      return;
    }
    setRefundError(null);
    setRefundLoadingId(bookingId);
    try {
      const res = await fetch(`/api/coaching/bookings/${bookingId}/refund-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!data.ok) {
        setRefundError(data.message ?? "Could not submit refund request.");
        return;
      }
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: "refund_requested",
                paymentStatus: "refund_requested",
                refundReason: reason,
              }
            : b,
        ),
      );
      setRefundReasonById((prev) => ({ ...prev, [bookingId]: "" }));
    } catch {
      setRefundError("Network error while submitting refund request.");
    } finally {
      setRefundLoadingId(null);
    }
  }

  const lastReport = reports[0];
  const previousReport = reports[1];
  const avgScore = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.overall, 0) / reports.length)
    : 0;
  const userFirstName = user ? user.name.split(" ")[0] : null;
  const trendDelta =
    reports.length >= 2 && previousReport && lastReport
      ? lastReport.overall - previousReport.overall
      : null;
  const trendDeltaLabel =
    trendDelta === null ? "N/A" : trendDelta > 0 ? `+${trendDelta}` : `${trendDelta}`;

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
          <Card>
            <CardHeader>
              <CardTitle>Progress trend</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {reports.length < 2 ? (
                <p className="text-sm text-ink-500">
                  Complete at least two interviews to unlock trend insights.
                </p>
              ) : (
                <>
                  <p className="text-sm text-ink-700">
                    Latest score change:{" "}
                    <span className="font-semibold text-ink-900">
                      {trendDeltaLabel}
                    </span>
                  </p>
                  <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                    <p className="text-xs text-ink-500">Last 5 interviews</p>
                    <div className="mt-2 flex items-end gap-2">
                      {reports.slice(0, 5).reverse().map((r) => (
                        <div key={r.id} className="flex-1 text-center">
                          <div className="mx-auto flex h-24 w-7 items-end rounded bg-ink-100">
                            <div
                              className="w-full rounded bg-accent-500"
                              style={{ height: `${Math.max(8, r.overall)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-ink-500">{r.overall}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
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
          <Card>
            <CardHeader>
              <CardTitle>Coaching bookings & refunds</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-sm text-ink-500">No coaching bookings yet.</p>
              ) : (
                bookings.slice(0, 4).map((b) => {
                  const canRequestRefund =
                    b.paymentStatus === "paid" &&
                    b.status !== "refund_requested" &&
                    b.status !== "refund_pending" &&
                    b.status !== "refunded";
                  return (
                    <div key={b.id} className="rounded-xl border border-ink-100 p-3">
                      <p className="text-sm font-medium text-ink-900">
                        {b.techArea} · with {b.coachName}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {formatDate(b.startsAt)} · ₹{b.amountInr} · {b.status}
                      </p>
                      {b.refundReason && (
                        <p className="mt-1 text-xs text-ink-600">
                          Refund reason: {b.refundReason}
                        </p>
                      )}
                      {canRequestRefund && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={refundReasonById[b.id] ?? ""}
                            onChange={(e) =>
                              setRefundReasonById((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter refund reason..."
                            className="h-20 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs outline-none ring-accent-500 focus:ring-2"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void requestRefund(b.id)}
                            disabled={refundLoadingId === b.id}
                          >
                            {refundLoadingId === b.id
                              ? "Submitting..."
                              : "Submit refund request"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {refundError && <p className="text-xs text-danger-600">{refundError}</p>}
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
