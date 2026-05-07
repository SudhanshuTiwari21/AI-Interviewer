"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CalendarClock, IndianRupee, UserRound } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Booking = {
  id: string;
  coachName: string;
  techArea: string;
  startsAt: string;
  durationMin: number;
  amountInr: number;
  status: string;
  paymentStatus: string;
  calendarMeetingUrl?: string | null;
  meetingProvider?: string | null;
};

function toneForStatus(status: string): "success" | "warn" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "pending") return "warn";
  if (status === "cancelled" || status === "rejected") return "danger";
  return "neutral";
}

export default function CoachBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="space-y-3">
        {bookings.map((b) => (
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
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={toneForStatus(b.status)} dot>
                  {b.status}
                </Badge>
                <Badge tone={b.paymentStatus === "paid" ? "success" : "neutral"}>
                  {b.paymentStatus}
                </Badge>
                {b.status === "approved" && b.paymentStatus === "paid" ? (
                  <Button
                    href={
                      b.meetingProvider === "livekit" || !b.calendarMeetingUrl
                        ? `/meeting/${b.id}`
                        : (b.calendarMeetingUrl as string)
                    }
                    size="sm"
                    variant="outline"
                  >
                    Join
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
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

      <div className="mt-8">{content}</div>
    </div>
  );
}
