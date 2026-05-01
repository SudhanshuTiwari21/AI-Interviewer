"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

type AlertRow = {
  id: string;
  bookingId: string;
  severity: string;
  category: string;
  title: string;
  evidenceText: string;
  confidence: number;
  status: string;
  createdAt: string;
  candidateName: string | null;
  coachName: string | null;
  startsAt: string | null;
};

export default function MeetingAlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/meeting-alerts", { cache: "no-store" });
    const data = await res.json();
    setAlerts(data.ok ? data.alerts : []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(alertId: string, status: "resolved" | "dismissed") {
    await fetch("/api/admin/meeting-alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ alertId, status }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Meeting alerts"
        description="Potential poaching/contact-sharing detections from meeting transcripts."
      />
      <Card>
        <CardBody className="space-y-3">
          {loading ? (
            <p className="text-sm text-ink-500">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-ink-500">No meeting alerts yet.</p>
          ) : (
            alerts.map((a) => (
              <div key={a.id} className="rounded-xl border border-ink-100 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.severity === "high" ? "danger" : a.severity === "medium" ? "warn" : "neutral"}>
                    {a.severity}
                  </Badge>
                  <Badge tone="neutral">{a.category}</Badge>
                  <Badge tone={a.status === "open" ? "warn" : "success"}>{a.status}</Badge>
                  <p className="text-xs text-ink-500">
                    {a.startsAt ? formatDate(a.startsAt) : "-"} · confidence {a.confidence}%
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink-900">{a.title}</p>
                <p className="mt-1 text-xs text-ink-500">
                  Candidate: {a.candidateName ?? "-"} · Coach: {a.coachName ?? "-"}
                </p>
                <p className="mt-2 rounded-md bg-ink-50 px-2 py-2 text-sm text-ink-700">
                  {a.evidenceText}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {a.status === "open" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void updateStatus(a.id, "resolved")}>
                        Mark resolved
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void updateStatus(a.id, "dismissed")}>
                        Dismiss
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
