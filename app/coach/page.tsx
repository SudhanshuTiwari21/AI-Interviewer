"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { bookingListCategory, isBookingSessionActive } from "@/lib/coaching/booking-session";

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

export default function CoachOverviewPage() {
  const [bookings, setBookings] = useState<CoachBooking[]>([]);

  useEffect(() => {
    void fetch("/api/coach/bookings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBookings(d.bookings);
      });
  }, []);

  const upcoming = useMemo(
    () =>
      bookings.filter((b) => {
        if (b.status !== "approved") return false;
        const phase = bookingListCategory(b.startsAt, b.durationMin ?? 30);
        return phase === "upcoming" || phase === "ongoing";
      }),
    [bookings],
  );
  const pending = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Coach dashboard</h1>
        <p className="text-sm text-ink-500">
          Review candidate requests assigned to you and manage upcoming sessions.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pending requests" value={String(pending)} />
        <Stat label="Upcoming sessions" value={String(upcoming.length)} />
        <Stat label="Total assigned" value={String(bookings.length)} />
      </div>
      <Card>
        <div className="border-b border-ink-100 px-5 py-3 text-sm font-semibold text-ink-900">
          Next sessions
        </div>
        <CardBody className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">No upcoming approved sessions yet.</p>
          ) : (
            upcoming.slice(0, 5).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-ink-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{b.candidateName}</p>
                  <p className="text-xs text-ink-500">
                    {b.techArea} · {formatDate(b.startsAt)} ·{" "}
                    {new Date(b.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="success" dot>
                    {b.status}
                  </Badge>
                  {b.calendarMeetingUrl || b.meetingProvider === "livekit" ? (
                    isBookingSessionActive(b.startsAt, b.durationMin ?? 30) ? (
                      <Button
                        href={b.meetingProvider === "livekit" ? `/meeting/${b.id}` : (b.calendarMeetingUrl as string)}
                        size="sm"
                        variant="outline"
                      >
                        Join
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-400">Ended</span>
                    )
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
      </CardBody>
    </Card>
  );
}
