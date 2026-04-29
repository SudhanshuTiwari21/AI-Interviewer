"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import { formatDate } from "@/lib/utils";
import { CalendarClock, X, ExternalLink, IndianRupee } from "lucide-react";

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
  status: "pending" | "approved" | "cancelled" | "rejected";
};

export default function AdminBookingsPage() {
  const { has } = useAdmin();
  const canCancel = has("bookings.cancel");

  const [bookings, setBookings] = useState<CoachingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled && data.ok) setBookings(data.bookings);
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = bookings.filter(
    (b) => new Date(b.startsAt).getTime() > Date.now(),
  );
  const past = bookings.filter(
    (b) => new Date(b.startsAt).getTime() <= Date.now(),
  );

  function cancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    void fetch(`/api/coaching/bookings/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Bookings"
        description="Coaching sessions scheduled by candidates."
      />

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
          ) : upcoming.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">
              No upcoming bookings yet.
            </div>
          ) : (
            <BookingsTable bookings={upcoming} canCancel={canCancel} onCancel={cancel} />
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
          ) : (
            <BookingsTable bookings={past} canCancel={false} onCancel={() => {}} />
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
}: Readonly<{
  bookings: CoachingBooking[];
  canCancel: boolean;
  onCancel: (id: string) => void;
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
                {formatDate(b.startsAt)}
              </Td>
              <Td className="text-xs text-ink-700">
                <IndianRupee className="mr-0.5 inline size-3.5" />
                {b.amountInr}
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
                      onClick={() =>
                        void fetch(`/api/coaching/bookings/${b.id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ status: "approved" }),
                        })
                      }
                    >
                      Approve
                    </Button>
                  )}
                  {b.status === "approved" && (
                    <a
                      href={"https://meet.google.com/apx-mock-coaching"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
                    >
                      Join <ExternalLink className="size-3" />
                    </a>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<X className="size-3.5" />}
                      className="text-danger-600 hover:bg-danger-50"
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
