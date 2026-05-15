"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import { formatDate } from "@/lib/utils";
import {
  canJoinCoachingSession,
  isBeforeCoachingJoinWindow,
  isBookingSessionEnded,
} from "@/lib/coaching/booking-session";
import { coachingJoinEligible, coachingJoinHref } from "@/lib/coaching/meeting-join";
import { CalendarClock, X, ExternalLink, IndianRupee, Search } from "lucide-react";

type CoachingBooking = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  coachName: string;
  coachEmail: string;
  startsAt: string;
  durationMin: number;
  amountInr: number;
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
  status: "pending" | "approved" | "cancelled" | "rejected";
};

function hasUsableJoinUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === "meet.google.com") {
      return !parsed.pathname.startsWith("/_meet/whoops");
    }
    return false;
  } catch {
    return false;
  }
}

export default function AdminBookingsPage() {
  const { has } = useAdmin();
  const canCancel = has("bookings.cancel");

  const [bookings, setBookings] = useState<CoachingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async (cancelled = false) => {
    try {
      const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled && data.ok) setBookings(data.bookings);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await loadBookings(cancelled);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadBookings]);

  const upcoming = bookings.filter(
    (b) => new Date(b.startsAt).getTime() > Date.now(),
  );
  const past = bookings.filter(
    (b) => new Date(b.startsAt).getTime() <= Date.now(),
  );

  const matchesSearch = useCallback(
    (b: CoachingBooking) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        b.id.toLowerCase().includes(q) ||
        b.coachName.toLowerCase().includes(q) ||
        b.candidateName.toLowerCase().includes(q) ||
        b.candidateEmail.toLowerCase().includes(q) ||
        b.techArea.toLowerCase().includes(q)
      );
    },
    [search],
  );

  const upcomingFiltered = useMemo(
    () => upcoming.filter(matchesSearch),
    [upcoming, matchesSearch],
  );
  const pastFiltered = useMemo(() => past.filter(matchesSearch), [past, matchesSearch]);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const res = await fetch(`/api/coaching/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const data = await res.json();
    if (!data?.ok) return;
    await loadBookings();
  }

  async function approve(id: string) {
    const res = await fetch(`/api/coaching/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    const data = await res.json();
    if (!data?.ok) return;
    await loadBookings();
  }

  // Meeting links are now handled via `/meeting/:bookingId` (LiveKit),
  // so we don't need a regenerate-link control in admin.

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Bookings"
        description="Coaching sessions scheduled by candidates."
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coach, candidate, email, tech area, or booking ID…"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
            aria-label="Filter bookings"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4 mb-6">
        <Stat label="Total bookings" value={String(bookings.length)} />
        <Stat label="Upcoming" value={String(upcoming.length)} />
        <Stat label="Confirmed" value={String(bookings.filter((x) => x.status === "approved").length)} />
        <Stat label="Completed / past" value={String(past.length)} />
      </div>

      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
            <CalendarClock className="size-4" /> Upcoming
          </p>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">Loading...</div>
          ) : upcomingFiltered.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">
              {search.trim()
                ? "No upcoming bookings match your search."
                : "No upcoming bookings yet."}
            </div>
          ) : (
            <BookingsTable
              bookings={upcomingFiltered}
              canCancel={canCancel}
              onCancel={(id) => {
                void cancel(id);
              }}
              onApprove={(id) => {
                void approve(id);
              }}
              onRegenerateMeetingLink={() => {}}
              regeneratingId={null}
            />
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-ink-100 px-5 py-3">
          <p className="text-sm font-semibold text-ink-900">Past sessions</p>
        </div>
        <CardBody className="p-0">
          {past.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">
              Past coaching sessions will appear here.
            </div>
          ) : pastFiltered.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">
              No past bookings match your search.
            </div>
          ) : (
            <BookingsTable
              bookings={pastFiltered}
              canCancel={false}
              onCancel={() => {}}
              onApprove={() => {}}
              onRegenerateMeetingLink={() => {}}
              regeneratingId={null}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function BookingsTable({
  bookings,
  canCancel,
  onCancel,
  onApprove,
  onRegenerateMeetingLink,
  regeneratingId,
}: Readonly<{
  bookings: CoachingBooking[];
  canCancel: boolean;
  onCancel: (id: string) => void;
  onApprove: (id: string) => void;
  onRegenerateMeetingLink: (id: string) => void;
  regeneratingId: string | null;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-500">
          <tr className="border-b border-ink-100">
            <Th>Coach</Th>
            <Th>Candidate</Th>
            <Th>Tech area</Th>
            <Th>Topic</Th>
            <Th>Starts</Th>
            <Th>Fee</Th>
            <Th>Duration</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr
              key={b.id}
              className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
            >
              <Td>
                <p className="font-medium text-ink-900">{b.coachName}</p>
                <p className="text-xs text-ink-500">{b.id}</p>
              </Td>
              <Td>
                <p className="text-xs text-ink-700">{b.candidateName}</p>
                <p className="text-xs text-ink-500">{b.candidateEmail}</p>
              </Td>
              <Td>{b.techArea}</Td>
              <Td>{`${b.durationMin}-minute coaching`}</Td>
              <Td className="whitespace-nowrap text-xs text-ink-500">
                {formatDate(b.startsAt)} ·{" "}
                {new Date(b.startsAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Td>
              <Td className="whitespace-nowrap text-xs text-ink-700">
                <span className="inline-flex items-center gap-0.5">
                  <IndianRupee className="size-3.5 shrink-0" aria-hidden />
                  <span>{b.amountInr}</span>
                </span>
              </Td>
              <Td className="text-xs text-ink-500">{b.durationMin} min</Td>
              <Td>
                <Badge
                  tone={
                    b.status === "approved"
                      ? "success"
                      : b.status === "pending"
                        ? "warn"
                        : "neutral"
                  }
                  dot
                >
                  {b.status}
                </Badge>
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-1.5">
                  {b.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onApprove(b.id)}
                    >
                      Approve
                    </Button>
                  )}
                  {b.status === "approved" &&
                    coachingJoinEligible(b) &&
                    canJoinCoachingSession(b.startsAt, b.durationMin) && (
                    <a
                      href={coachingJoinHref(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
                    >
                      Join <ExternalLink className="size-3" />
                    </a>
                  )}
                  {b.status === "approved" &&
                    coachingJoinEligible(b) &&
                    isBeforeCoachingJoinWindow(b.startsAt) && (
                    <span className="text-xs text-ink-400">Join not open yet</span>
                  )}
                  {b.status === "approved" &&
                    coachingJoinEligible(b) &&
                    isBookingSessionEnded(b.startsAt, b.durationMin) && (
                    <span className="text-xs text-ink-400">Ended</span>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<X className="size-3.5" />}
                      className="text-danger-600 hover:bg-danger-50"
                      disabled={b.status !== "pending"}
                      onClick={() => onCancel(b.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
      </CardBody>
    </Card>
  );
}

function Th({
  children,
  className,
}: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return (
    <th
      className={`px-5 py-3 text-left font-medium uppercase tracking-wide ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return (
    <td className={`px-5 py-4 align-middle text-ink-700 ${className ?? ""}`}>
      {children}
    </td>
  );
}
