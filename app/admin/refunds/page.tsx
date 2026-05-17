"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, useAdmin } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatTicketPriority, formatTicketStatus } from "@/lib/support/ticket-labels";
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

type SupportTicket = {
  id: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminRefundsPage() {
  const { has } = useAdmin();
  const canManageSupport = has("support.manage");

  const [rows, setRows] = useState<CoachingBooking[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [eventsByBooking, setEventsByBooking] = useState<Record<string, RefundEvent[]>>({});
  const [noteByBooking, setNoteByBooking] = useState<Record<string, string>>({});
  const [noteByTicket, setNoteByTicket] = useState<Record<string, string>>({});
  const [amountByBooking, setAmountByBooking] = useState<Record<string, string>>({});
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [savingBookingNoteId, setSavingBookingNoteId] = useState<string | null>(null);

  async function load() {
    const [bookingsRes, supportRes] = await Promise.all([
      fetch("/api/coaching/bookings", { cache: "no-store" }),
      fetch("/api/admin/support/tickets?category=refund", { cache: "no-store" }),
    ]);
    const data = await bookingsRes.json();
    const supportData = await supportRes.json();

    if (supportData.ok) {
      setSupportTickets(supportData.tickets);
      setNoteByTicket((prev) => {
        const next = { ...prev };
        for (const t of supportData.tickets as SupportTicket[]) {
          if (next[t.id] === undefined && t.adminNote) next[t.id] = t.adminNote;
        }
        return next;
      });
    }

    if (!data.ok) return;
    setRows(data.bookings);
    const ids = (data.bookings as CoachingBooking[])
      .map((x) => x.id)
      .filter(Boolean)
      .join(",");
    if (!ids) {
      setEventsByBooking({});
      return;
    }
    const eventsRes = await fetch(
      `/api/coaching/refund-events?bookingIds=${encodeURIComponent(ids)}`,
      { cache: "no-store" },
    );
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

  const openSupportTickets = supportTickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
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

  async function saveRefundNote(id: string) {
    setSavingBookingNoteId(id);
    try {
      await fetch(`/api/coaching/bookings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          refundAdminNote: noteByBooking[id] ?? "",
        }),
      });
      await load();
    } finally {
      setSavingBookingNoteId(null);
    }
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

  async function saveSupportTicketNote(ticket: SupportTicket) {
    if (!canManageSupport) return;
    setSavingTicketId(ticket.id);
    try {
      await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          updateAdminNoteOnly: true,
          adminNote: (noteByTicket[ticket.id] ?? ticket.adminNote ?? "").trim(),
        }),
      });
      await load();
    } finally {
      setSavingTicketId(null);
    }
  }

  async function updateSupportTicket(ticket: SupportTicket, status: SupportTicket["status"]) {
    if (!canManageSupport) return;
    setSavingTicketId(ticket.id);
    try {
      await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          status,
          adminNote: noteByTicket[ticket.id] ?? ticket.adminNote ?? "",
          priority: ticket.priority,
        }),
      });
      await load();
    } finally {
      setSavingTicketId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        title="Refund requests"
        description="Support refund tickets from candidates and Razorpay refunds for paid coaching bookings."
      />

      <Card>
        <CardBody className="border-b border-ink-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">Support refund tickets</p>
              <p className="mt-1 text-xs text-ink-500">
                Raised from Support → Refund. Closing a ticket emails the candidate.
              </p>
            </div>
            <Badge tone={openSupportTickets.length > 0 ? "warn" : "neutral"} dot>
              {openSupportTickets.length} open
            </Badge>
          </div>
        </CardBody>
        <CardBody className="p-0">
          {supportTickets.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-ink-500">
              No support refund tickets yet.
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {supportTickets.map((t) => (
                <div key={t.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{t.subject}</p>
                      <p className="text-xs text-ink-500">
                        {t.userName} · {t.userEmail}
                      </p>
                      <p className="mt-2 text-sm text-ink-700">{t.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={t.status === "closed" ? "neutral" : "warn"} dot>
                        {formatTicketStatus(t.status)}
                      </Badge>
                      <Badge tone="accent" dot>
                        {formatTicketPriority(t.priority)}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-ink-500">
                    Raised {formatDate(t.createdAt)} · Updated {formatDate(t.updatedAt)}
                  </p>
                  {canManageSupport ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm"
                        placeholder="Admin note (optional, included in close email)"
                        value={noteByTicket[t.id] ?? ""}
                        onChange={(e) =>
                          setNoteByTicket((prev) => ({ ...prev, [t.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingTicketId === t.id}
                        onClick={() => void saveSupportTicketNote(t)}
                      >
                        Save note
                      </Button>
                      {t.status !== "closed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingTicketId === t.id}
                            onClick={() => void updateSupportTicket(t, "in_progress")}
                          >
                            In progress
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingTicketId === t.id}
                            onClick={() => void updateSupportTicket(t, "closed")}
                          >
                            Close ticket
                          </Button>
                        </>
                      )}
                      <Button href="/admin/support" size="sm" variant="ghost">
                        All tickets
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="border-b border-ink-100 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">Coaching payment refunds</p>
          <p className="mt-1 text-xs text-ink-500">
            Refunds tied to a paid coaching booking (Razorpay). Requested from the candidate
            dashboard.
          </p>
        </CardBody>
        <CardBody className="p-0">
          {refundRows.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-ink-500">
              No coaching payment refund requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
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
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingBookingNoteId === r.id}
                            onClick={() => void saveRefundNote(r.id)}
                          >
                            Save note
                          </Button>
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
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
