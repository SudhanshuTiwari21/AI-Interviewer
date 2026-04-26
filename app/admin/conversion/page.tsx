"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import type { InterviewReport } from "@/lib/question-engine";

type UserRow = { id: string };
type BookingRow = { id: string };

export default function AdminConversionPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
    void fetch("/api/admin/users?pageSize=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUsers(d.users);
      });
    void fetch("/api/coaching/bookings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setBookings(d.bookings);
      });
  }, []);

  const funnel = useMemo(() => {
    const signedUp = users.length;
    const interviewDone = reports.length;
    const coachingBooked = bookings.length;
    return [
      { label: "Signups", value: signedUp },
      { label: "Interview completed", value: interviewDone },
      { label: "Coaching booked", value: coachingBooked },
    ];
  }, [bookings.length, reports.length, users.length]);

  const base = Math.max(funnel[0]?.value ?? 1, 1);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Conversion reports"
        description="Track movement from signup to interview completion to coaching booking."
      />
      <Card>
        <CardBody className="space-y-4">
          {funnel.map((step) => (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-700">{step.label}</span>
                <span className="font-medium text-ink-900">
                  {step.value} ({Math.round((step.value / base) * 100)}%)
                </span>
              </div>
              <Progress value={Math.round((step.value / base) * 100)} tone="accent" />
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
