"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { InterviewReport } from "@/lib/question-engine";
import { formatCurrency, formatDate } from "@/lib/utils";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";

type CoachingBooking = {
  id: string;
  candidateName: string;
  techArea: string;
  amountInr: number;
  paymentStatus: string;
  status: string;
  createdAt: string;
};

const INTERVIEW_PRICE = INTERVIEW_PRICE_INR;

export default function AdminPaymentsPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [coachBookings, setCoachBookings] = useState<CoachingBooking[]>([]);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
    void fetch("/api/coaching/bookings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCoachBookings(d.bookings);
      });
  }, []);

  const summary = useMemo(() => {
    const interviewRevenue = reports.length * INTERVIEW_PRICE;
    const coachingRevenue = coachBookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + b.amountInr, 0);
    return {
      interviewRevenue,
      coachingRevenue,
      totalRevenue: interviewRevenue + coachingRevenue,
      interviewCount: reports.length,
      coachingCount: coachBookings.length,
    };
  }, [coachBookings, reports.length]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Payment dashboard"
        description="Revenue and transaction stream across interview and coaching products."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Interview revenue" value={formatCurrency(summary.interviewRevenue, "INR")} />
        <Metric label="Coaching revenue" value={formatCurrency(summary.coachingRevenue, "INR")} />
        <Metric label="Total revenue" value={formatCurrency(summary.totalRevenue, "INR")} />
        <Metric
          label="Transactions"
          value={`${summary.interviewCount + summary.coachingCount}`}
        />
      </div>

      <Card>
        <div className="border-b border-ink-100 px-5 py-3">
          <p className="text-sm font-semibold text-ink-900">Recent coaching payments</p>
        </div>
        <CardBody className="p-0">
          {coachBookings.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-500">
              No coaching payments yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-3 text-left">Candidate</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Payment</th>
                  <th className="px-5 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {coachBookings.slice(0, 20).map((b) => (
                  <tr key={b.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink-900">{b.candidateName}</p>
                      <p className="text-xs text-ink-500">{b.id}</p>
                    </td>
                    <td className="px-5 py-3 text-ink-700">{b.techArea} coaching</td>
                    <td className="px-5 py-3 font-medium text-ink-900">
                      {formatCurrency(b.amountInr, "INR")}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={b.paymentStatus === "paid" ? "success" : "warn"} dot>
                        {b.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-500">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
      </CardBody>
    </Card>
  );
}
