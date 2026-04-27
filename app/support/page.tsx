"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  adminNote: string | null;
  createdAt: string;
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
        description="Raise payment/refund/custom issues. Admin team resolves tickets from dashboard."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-ink-900">Raise a support ticket</p>
            <label className="block text-xs text-ink-600">
              Category
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
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                placeholder="Refund not credited yet"
              />
            </label>
            <label className="block text-xs text-ink-600">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-32 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                placeholder="Describe your issue in detail..."
              />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink-500">{message}</span>
              <Button
                disabled={submitting || subject.trim().length < 5 || description.trim().length < 15}
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
                      <Badge tone={ticketTone(t.status)}>{t.status}</Badge>
                      <Badge tone={t.priority === "high" ? "danger" : t.priority === "medium" ? "warn" : "neutral"}>
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {t.category} · {new Date(t.createdAt).toLocaleString()}
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
