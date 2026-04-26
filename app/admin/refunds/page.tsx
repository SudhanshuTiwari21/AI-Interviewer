"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";

type CoachingBooking = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  amountInr: number;
  status: "pending" | "approved" | "cancelled" | "rejected" | "refund_pending" | "refunded";
  createdAt: string;
};

export default function AdminRefundsPage() {
  const [rows, setRows] = useState<CoachingBooking[]>([]);

  async function load() {
    const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) return;
    setRows(data.bookings);
  }

  useEffect(() => {
    void load();
  }, []);

  const refundRows = rows.filter(
    (r) => r.status === "cancelled" || r.status === "refund_pending" || r.status === "refunded",
  );

  async function updateStatus(id: string, status: CoachingBooking["status"]) {
    await fetch(`/api/coaching/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Refund requests"
        description="Manage cancellations and refund operations for coaching payments."
      />
      <Card>
        <CardBody className="p-0">
          {refundRows.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-500">
              No refund requests yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr className="border-b border-ink-100">
                  <th className="px-5 py-3 text-left">Candidate</th>
                  <th className="px-5 py-3 text-left">Context</th>
                  <th className="px-5 py-3 text-left">Amount</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundRows.map((r) => (
                  <tr key={r.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink-900">{r.candidateName}</p>
                      <p className="text-xs text-ink-500">{r.candidateEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-ink-700">{r.techArea} coaching</p>
                      <p className="text-xs text-ink-500">{formatDate(r.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(r.amountInr, "INR")}</td>
                    <td className="px-5 py-3">
                      <Badge tone={r.status === "refunded" ? "success" : "warn"} dot>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {r.status !== "refund_pending" && r.status !== "refunded" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void updateStatus(r.id, "refund_pending")}
                          >
                            Mark pending
                          </Button>
                        )}
                        {r.status !== "refunded" && (
                          <Button size="sm" onClick={() => void updateStatus(r.id, "refunded")}>
                            Mark refunded
                          </Button>
                        )}
                      </div>
                    </td>
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
