"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CalendarClock, IndianRupee, Search, UserRound } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  bookingListCategory,
  canJoinCoachingSession,
  isBeforeCoachingJoinWindow,
  isBookingSessionEnded,
} from "@/lib/coaching/booking-session";
import { coachingJoinEligible, coachingJoinHref } from "@/lib/coaching/meeting-join";

type Booking = {
  id: string;
  coachName: string;
  techArea: string;
  startsAt: string;
  durationMin: number;
  amountInr: number;
  status: string;
  paymentStatus: string;
  notes?: string | null;
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
};

function toneForStatus(status: string): "success" | "warn" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "pending") return "warn";
  if (status === "cancelled" || status === "rejected") return "danger";
  return "neutral";
}

function BookingSection({ title, rows }: Readonly<{ title: string; rows: Booking[] }>) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-ink-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">No bookings in this section.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <Card key={b.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{b.techArea}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound className="size-3.5" />
                      Coach: {b.coachName}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" />
                      {formatDate(b.startsAt)} ·{" "}
                      {new Date(b.startsAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      · {b.durationMin} min
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <IndianRupee className="size-3.5" />
                      ₹{b.amountInr}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-400">Booking ID: {b.id}</p>
                  {b.status === "rejected" && b.notes?.trim() ? (
                    <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50/80 p-2 text-xs text-ink-700">
                      <p className="font-medium text-ink-800">Reason from coach</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{b.notes}</p>
                      <p className="mt-2 text-ink-500">
                        If you were charged, eligible refunds are processed per our policy. For billing help, contact
                        support from your dashboard.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={toneForStatus(b.status)} dot>
                    {b.status}
                  </Badge>
                  <Badge tone={b.paymentStatus === "paid" ? "success" : "neutral"}>{b.paymentStatus}</Badge>
                  {b.status === "approved" && b.paymentStatus === "paid" && coachingJoinEligible(b) ? (
                    canJoinCoachingSession(b.startsAt, b.durationMin ?? 30) ? (
                      <Button href={coachingJoinHref(b)} size="sm" variant="outline">
                        Join
                      </Button>
                    ) : isBeforeCoachingJoinWindow(b.startsAt) ? (
                      <span className="text-xs text-ink-400">Join opens closer to session time</span>
                    ) : isBookingSessionEnded(b.startsAt, b.durationMin ?? 30) ? (
                      <span className="text-xs text-ink-400">Session ended</span>
                    ) : null
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setBookings(data.ok ? data.bookings : []);
      } catch {
        if (!cancelled) setBookings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.coachName.toLowerCase().includes(q) ||
        b.techArea.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        formatDate(b.startsAt).toLowerCase().includes(q),
    );
  }, [bookings, search]);

  const { upcoming, ongoing, past } = useMemo(() => {
    const upcoming: Booking[] = [];
    const ongoing: Booking[] = [];
    const past: Booking[] = [];
    for (const b of filtered) {
      const cat = bookingListCategory(b.startsAt, b.durationMin ?? 30);
      if (cat === "upcoming") upcoming.push(b);
      else if (cat === "ongoing") ongoing.push(b);
      else past.push(b);
    }
    return { upcoming, ongoing, past };
  }, [filtered]);

  let content: React.ReactNode;
  if (loading) {
    content = <Card className="p-8 text-center text-sm text-ink-500">Loading bookings...</Card>;
  } else if (bookings.length === 0) {
    content = (
      <Card className="p-12 text-center">
        <p className="text-sm font-medium text-ink-900">No coach bookings yet</p>
        <p className="mt-1 text-sm text-ink-500">
          Book your first coaching session to see it listed here.
        </p>
        <div className="mt-5">
          <Button href="/schedule">Book now</Button>
        </div>
      </Card>
    );
  } else {
    content = (
      <div className="space-y-8">
        <BookingSection title="Ongoing" rows={ongoing} />
        <BookingSection title="Upcoming" rows={upcoming} />
        <BookingSection title="Past" rows={past} />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        title="Coach bookings"
        description="Track your coaching requests and upcoming confirmed sessions."
        actions={
          <Button href="/schedule" leftIcon={<CalendarClock className="size-4" />}>
            Book a coach
          </Button>
        }
      />

      {bookings.length > 0 && (
        <div className="relative mt-6 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coach, topic, date, or booking ID…"
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-3 text-sm text-ink-800 outline-none ring-accent-500 focus:ring-2"
            aria-label="Filter bookings"
          />
        </div>
      )}

      <div className="mt-8">{content}</div>
    </div>
  );
}
