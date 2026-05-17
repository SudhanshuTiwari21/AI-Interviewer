"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  bookingJoinOpensAtMs,
  bookingListCategory,
  canJoinCoachingSession,
  isBeforeCoachingJoinWindow,
  isBookingSessionEnded,
} from "@/lib/coaching/booking-session";
import { coachingJoinEligible, coachingJoinHref } from "@/lib/coaching/meeting-join";
import { Search } from "lucide-react";

type CoachBooking = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  startsAt: string;
  durationMin: number;
  status: string;
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
};

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CoachSessionsPage() {
  const [rows, setRows] = useState<CoachBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    const res = await fetch("/api/coach/bookings", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setRows(data.bookings);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.techArea.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        formatDate(r.startsAt).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const { upcoming, ongoing, past } = useMemo(() => {
    const upcoming: CoachBooking[] = [];
    const ongoing: CoachBooking[] = [];
    const past: CoachBooking[] = [];
    for (const r of filtered) {
      const cat = bookingListCategory(r.startsAt, r.durationMin ?? 30);
      if (cat === "upcoming") upcoming.push(r);
      else if (cat === "ongoing") ongoing.push(r);
      else past.push(r);
    }
    return { upcoming, ongoing, past };
  }, [filtered]);

  async function decide(id: string, action: "approve") {
    setLoading(true);
    await fetch(`/api/coach/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setLoading(false);
  }

  async function submitReject() {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) return;
    setLoading(true);
    await fetch(`/api/coach/bookings/${rejecting.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionReason: reason }),
    });
    setRejecting(null);
    setRejectReason("");
    await load();
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold text-ink-900">Session requests</h1>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by candidate, email, track, date, or booking ID…"
          className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
          aria-label="Filter sessions"
        />
      </div>

      <SessionSection title="Ongoing" rows={ongoing} loading={loading} onApprove={decide} onRejectOpen={(id) => setRejecting({ id })} />
      <div className="mt-6">
        <SessionSection title="Upcoming" rows={upcoming} loading={loading} onApprove={decide} onRejectOpen={(id) => setRejecting({ id })} />
      </div>
      <div className="mt-6">
        <SessionSection title="Past" rows={past} loading={loading} onApprove={decide} onRejectOpen={(id) => setRejecting({ id })} />
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-ink-900">Reject session</p>
            <p className="mt-1 text-xs text-ink-500">
              Candidates will see this reason. Minimum 5 characters.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-ink-200 p-2 text-sm text-ink-800"
              placeholder="Explain why you cannot take this session…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setRejecting(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={loading || rejectReason.trim().length < 5} onClick={() => void submitReject()}>
                Submit rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionSection({
  title,
  rows,
  loading,
  onApprove,
  onRejectOpen,
}: Readonly<{
  title: string;
  rows: CoachBooking[];
  loading: boolean;
  onApprove: (id: string, action: "approve") => void;
  onRejectOpen: (id: string) => void;
}>) {
  return (
    <Card>
      <div className="border-b border-ink-100 px-5 py-3">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{rows.length} session{rows.length === 1 ? "" : "s"}</p>
      </div>
      <CardBody className="space-y-3 p-4 md:hidden">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-500">No sessions in this category.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink-900">{row.candidateName}</p>
                  <p className="text-xs text-ink-500">{row.candidateEmail}</p>
                </div>
                <Badge
                  tone={
                    row.status === "approved"
                      ? "success"
                      : row.status === "rejected" || row.status === "cancelled"
                        ? "danger"
                        : "warn"
                  }
                  dot
                >
                  {row.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-ink-700">{row.techArea}</p>
              <p className="mt-1 text-xs text-ink-500">
                {formatDate(row.startsAt)} · {formatSessionTime(row.startsAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loading}
                      onClick={() => onRejectOpen(row.id)}
                    >
                      Reject
                    </Button>
                    <Button size="sm" disabled={loading} onClick={() => void onApprove(row.id, "approve")}>
                      Approve
                    </Button>
                  </>
                ) : row.status === "approved" &&
                  coachingJoinEligible(row) &&
                  canJoinCoachingSession(row.startsAt, row.durationMin ?? 30) ? (
                  <Button href={coachingJoinHref(row)} size="sm" variant="outline">
                    Join
                  </Button>
                ) : (
                  <span className="text-xs text-ink-400">No action</span>
                )}
              </div>
            </div>
          ))
        )}
      </CardBody>
      <CardBody className="hidden p-0 md:block">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-xs text-ink-500">
            <tr className="border-b border-ink-100">
              <th className="px-5 py-3 text-left">Candidate</th>
              <th className="px-5 py-3 text-left">Track</th>
              <th className="px-5 py-3 text-left">Time</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-100 last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink-900">{row.candidateName}</p>
                  <p className="text-xs text-ink-500">{row.candidateEmail}</p>
                </td>
                <td className="px-5 py-3">{row.techArea}</td>
                <td className="px-5 py-3 text-xs text-ink-600">
                  {formatDate(row.startsAt)} · {formatSessionTime(row.startsAt)}
                </td>
                <td className="px-5 py-3">
                  <Badge
                    tone={
                      row.status === "approved"
                        ? "success"
                        : row.status === "rejected" || row.status === "cancelled"
                          ? "danger"
                          : "warn"
                    }
                    dot
                  >
                    {row.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  {row.status === "pending" ? (
                    <div className="inline-flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => onRejectOpen(row.id)}
                      >
                        Reject
                      </Button>
                      <Button size="sm" disabled={loading} onClick={() => void onApprove(row.id, "approve")}>
                        Approve
                      </Button>
                    </div>
                  ) : row.status === "approved" &&
                    coachingJoinEligible(row) &&
                    canJoinCoachingSession(row.startsAt, row.durationMin ?? 30) ? (
                    <Button href={coachingJoinHref(row)} size="sm" variant="outline">
                      Join
                    </Button>
                  ) : row.status === "approved" &&
                    coachingJoinEligible(row) &&
                    isBeforeCoachingJoinWindow(row.startsAt) ? (
                    <span className="text-xs text-ink-400">
                      Join opens{" "}
                      {new Date(bookingJoinOpensAtMs(row.startsAt)).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : row.status === "approved" &&
                    coachingJoinEligible(row) &&
                    isBookingSessionEnded(row.startsAt, row.durationMin ?? 30) ? (
                    <span className="text-xs text-ink-400">Session ended</span>
                  ) : (
                    <span className="text-xs text-ink-400">No action</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-ink-500">
                  No sessions in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </CardBody>
    </Card>
  );
}
