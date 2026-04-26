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
  status:
    | "pending"
    | "approved"
    | "cancelled"
    | "rejected"
    | "refund_requested"
    | "refund_pending"
    | "partially_refunded"
    | "refunded";
  paymentStatus: string;
  refundReason: string | null;
  refundRequestedAt: string | null;
  createdAt: string;
};

type RefundEvent = {
  id: string;
  bookingId: string;
  eventType: string;
  actorEmail: string | null;
  note: string | null;
  amountInr: number | null;
  createdAt: string;
};

export default function AdminRefundsPage() {
  const [rows, setRows] = useState<CoachingBooking[]>([]);
  const [eventsByBooking, setEventsByBooking] = useState<Record<string, RefundEvent[]>>({});
  const [noteByBooking, setNoteByBooking] = useState<Record<string, string>>({});
  const [amountByBooking, setAmountByBooking] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) return;
    setRows(data.bookings);
    const ids = (data.bookings as CoachingBooking[])
      .map((x) => x.id)
      .filter(Boolean)
      .join(",");
    if (!ids) return;
    const eventsRes = await fetch(`/api/coaching/refund-events?bookingIds=${encodeURIComponent(ids)}`, {
      cache: "no-store",
    });
    const eventsData = await eventsRes.json();
    if (!eventsData.ok) return;
    const grouped: Record<string, RefundEvent[]> = {};
    (eventsData.events as RefundEvent[]).forEach((ev) => {
      if (!grouped[ev.bookingId]) grouped[ev.bookingId] = [];
      grouped[ev.bookingId].push(ev);
    });
    setEventsByBooking(grouped);
  }

  useEffect(() => {
    void load();
  }, []);

  const refundRows = rows.filter(
    (r) =>
      r.status === "refund_requested" ||
      r.status === "refund_pending" ||
      r.status === "partially_refunded" ||
      r.status === "refunded",
  );

  async function approveRefund(id: string) {
    const typed = Number(amountByBooking[id] || 0);
    const payload: Record<string, unknown> = {
      action: "approve_refund",
      refundAdminNote: noteByBooking[id] || undefined,
    };
    if (typed > 0) payload.refundAmountInr = typed;
    await fetch(`/api/coaching/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load();
  }

  async function rejectRefund(id: string) {
    await fetch(`/api/coaching/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "reject_refund",
        refundAdminNote: noteByBooking[id] || undefined,
      }),
    });
    await load();
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
                  <th className="px-5 py-3 text-left">Refund reason</th>
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
                    <td className="px-5 py-3 text-xs text-ink-600">
                      {r.refundReason ?? "—"}
                    </td>
                    <td className="px-5 py-3">{formatCurrency(r.amountInr, "INR")}</td>
                    <td className="px-5 py-3">
                      <Badge tone={r.status === "refunded" ? "success" : "warn"} dot>
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex flex-col items-end gap-2">
                        <div className="flex w-64 gap-2">
                          <input
                            className="w-24 rounded-md border border-ink-200 px-2 py-1 text-xs"
                            placeholder="Amount"
                            value={amountByBooking[r.id] ?? ""}
                            onChange={(e) =>
                              setAmountByBooking((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                          <input
                            className="flex-1 rounded-md border border-ink-200 px-2 py-1 text-xs"
                            placeholder="Admin note (optional)"
                            value={noteByBooking[r.id] ?? ""}
                            onChange={(e) =>
                              setNoteByBooking((prev) => ({
                                ...prev,
                                [r.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="inline-flex gap-2">
                        {r.status === "refund_requested" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void rejectRefund(r.id)}
                          >
                            Reject
                          </Button>
                        )}
                        {r.status !== "refunded" && (
                          <Button size="sm" onClick={() => void approveRefund(r.id)}>
                            Approve & refund
                          </Button>
                        )}
                        </div>
                        <div className="w-64 rounded-lg bg-ink-50 p-2 text-left">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                            Timeline
                          </p>
                          <div className="mt-1 space-y-1">
                            {(eventsByBooking[r.id] ?? []).slice(0, 4).map((ev) => (
                              <p key={ev.id} className="text-[11px] text-ink-600">
                                {formatDate(ev.createdAt)} · {ev.eventType}
                                {ev.amountInr ? ` · ₹${ev.amountInr}` : ""}
                                {ev.note ? ` · ${ev.note}` : ""}
                              </p>
                            ))}
                            {(eventsByBooking[r.id] ?? []).length === 0 && (
                              <p className="text-[11px] text-ink-500">No history yet</p>
                            )}
                          </div>
                        </div>
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
