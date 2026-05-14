"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader, useAdmin } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTicketPriority, formatTicketStatus } from "@/lib/support/ticket-labels";

type Ticket = {
  id: string;
  userEmail: string;
  userName: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminSupportPage() {
  const { has } = useAdmin();
  const canManage = has("support.manage");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | Ticket["status"]>("all");
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
    const res = await fetch(`/api/admin/support/tickets${query}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setTickets(data.tickets);
  }, [statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function updateTicket(ticket: Ticket, status: Ticket["status"]) {
    if (!canManage) return;
    setSavingId(ticket.id);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          status,
          adminNote: noteById[ticket.id] ?? ticket.adminNote ?? "",
          priority: ticket.priority,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadTickets();
      }
    } finally {
      setSavingId(null);
    }
  }

  const openCount = useMemo(
    () => tickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
    [tickets],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Support tickets"
        description="Resolve candidate support issues from one queue."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="warn">Open {openCount}</Badge>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | Ticket["status"])}
              className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm"
            >
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        }
      />

      <Card>
        <CardBody className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-sm text-ink-500">No tickets found for this filter.</p>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-ink-100 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-ink-900">{t.subject}</p>
                  <Badge tone={statusTone(t.status)}>{formatTicketStatus(t.status)}</Badge>
                  <Badge tone={priorityTone(t.priority)}>{formatTicketPriority(t.priority)}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {t.userName} ({t.userEmail}) · {t.category}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  <span className="font-medium text-ink-800">Raised at:</span>{" "}
                  {new Date(t.createdAt).toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-ink-600">
                  <span className="font-medium text-ink-800">Last updated at:</span>{" "}
                  {new Date(t.updatedAt ?? t.createdAt).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-ink-700">{t.description}</p>
                <textarea
                  value={noteById[t.id] ?? t.adminNote ?? ""}
                  onChange={(e) =>
                    setNoteById((prev) => ({ ...prev, [t.id]: e.target.value }))
                  }
                  placeholder="Internal/admin resolution note..."
                  className="mt-3 h-20 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || savingId === t.id}
                    onClick={() => void updateTicket(t, "in_progress")}
                  >
                    Mark in progress
                  </Button>
                  <Button
                    size="sm"
                    disabled={!canManage || savingId === t.id}
                    onClick={() => void updateTicket(t, "resolved")}
                  >
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!canManage || savingId === t.id}
                    onClick={() => void updateTicket(t, "closed")}
                  >
                    Close
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function statusTone(status: Ticket["status"]): "success" | "warn" | "accent" | "neutral" {
  if (status === "resolved") return "success";
  if (status === "in_progress") return "accent";
  if (status === "closed") return "neutral";
  return "warn";
}

function priorityTone(priority: Ticket["priority"]): "danger" | "warn" | "neutral" {
  if (priority === "high") return "danger";
  if (priority === "medium") return "warn";
  return "neutral";
}
