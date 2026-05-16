"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatTicketPriority, formatTicketStatus } from "@/lib/support/ticket-labels";
import {
  SUPPORT_TICKET_DESCRIPTION_MIN,
  SUPPORT_TICKET_SUBJECT_MIN,
} from "@/lib/support/ticket-form-requirements";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  { id: "payment", label: "Payment" },
  { id: "refund", label: "Refund" },
  { id: "account", label: "Account" },
  { id: "coaching", label: "Coaching" },
  { id: "technical", label: "Technical issue" },
  { id: "custom", label: "Custom problem" },
] as const;

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("payment");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const subjectLen = subject.trim().length;
  const descriptionLen = description.trim().length;
  const subjectOk = subjectLen >= SUPPORT_TICKET_SUBJECT_MIN;
  const descriptionOk = descriptionLen >= SUPPORT_TICKET_DESCRIPTION_MIN;
  async function loadTickets() {
    const res = await fetch("/api/support/tickets", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setTickets(data.tickets);
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function createTicket() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, subject, description }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessage(data.message ?? "Could not raise ticket.");
        return;
      }
      setSubject("");
      setDescription("");
      setMessage("Ticket submitted. Our team will review it shortly.");
      await loadTickets();
    } catch {
      setMessage("Network error while creating ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        title="Support"
        description="Raise payment/refund/custom issues."
        actions={
          <Button href="/dashboard" variant="outline" size="sm" leftIcon={<ArrowLeft className="size-4" />}>
            Overview
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Raise a support ticket</p>
            <label className="block text-xs text-ink-600">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number]["id"])}
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-ink-600">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                placeholder="Refund not credited yet"
                aria-describedby="support-subject-hint"
              />
              <p
                id="support-subject-hint"
                className={cn(
                  "mt-1 text-[11px]",
                  subjectLen > 0 && !subjectOk ? "text-danger-600" : "text-ink-500",
                )}
              >
                Minimum {SUPPORT_TICKET_SUBJECT_MIN} characters ({subjectLen}/{SUPPORT_TICKET_SUBJECT_MIN}).
              </p>
            </label>
            <label className="block text-xs text-ink-600">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-32 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                placeholder="Describe your issue in detail..."
                aria-describedby="support-description-hint"
              />
              <p
                id="support-description-hint"
                className={cn(
                  "mt-1 text-[11px]",
                  descriptionLen > 0 && !descriptionOk ? "text-danger-600" : "text-ink-500",
                )}
              >
                Minimum {SUPPORT_TICKET_DESCRIPTION_MIN} characters ({descriptionLen}/
                {SUPPORT_TICKET_DESCRIPTION_MIN}).
              </p>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-ink-500">{message}</span>
              <Button
                disabled={submitting || !subjectOk || !descriptionOk}
                onClick={() => void createTicket()}
              >
                {submitting ? "Submitting..." : "Submit ticket"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-semibold text-ink-900">Your tickets</p>
            {tickets.length === 0 ? (
              <p className="text-sm text-ink-500">No support tickets yet.</p>
            ) : (
              <ul className="space-y-3">
                {tickets.map((t) => (
                  <li key={t.id} className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">{t.subject}</p>
                      <Badge tone={ticketTone(t.status)}>{formatTicketStatus(t.status)}</Badge>
                      <Badge tone={priorityTone(t.priority)}>
                        {formatTicketPriority(t.priority)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {t.category}
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
                    {t.adminNote && (
                      <p className="mt-2 rounded-md border border-ink-200 bg-white px-2 py-1.5 text-xs text-ink-600">
                        Admin note: {t.adminNote}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ticketTone(status: Ticket["status"]): "accent" | "warn" | "success" | "neutral" {
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
