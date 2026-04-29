"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type CoachBooking = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  startsAt: string;
  status: string;
  calendarMeetingUrl?: string | null;
};

export default function CoachSessionsPage() {
  const [rows, setRows] = useState<CoachBooking[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/coach/bookings", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setRows(data.bookings);
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, action: "approve" | "reject") {
    setLoading(true);
    await fetch(`/api/coach/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold text-ink-900">Session requests</h1>
      <Card>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500">
              <tr className="border-b border-ink-100">
                <th className="px-5 py-3 text-left">Candidate</th>
                <th className="px-5 py-3 text-left">Track</th>
                <th className="px-5 py-3 text-left">Time</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-ink-100 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink-900">{row.candidateName}</p>
                    <p className="text-xs text-ink-500">{row.candidateEmail}</p>
                  </td>
                  <td className="px-5 py-3">{row.techArea}</td>
                  <td className="px-5 py-3 text-xs text-ink-500">{formatDate(row.startsAt)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={row.status === "approved" ? "success" : "warn"} dot>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.status === "pending" ? (
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => void decide(row.id, "reject")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={loading}
                          onClick={() => void decide(row.id, "approve")}
                        >
                          Approve
                        </Button>
                      </div>
                    ) : row.status === "approved" && row.calendarMeetingUrl ? (
                      <Button href={row.calendarMeetingUrl} size="sm" variant="outline">
                        Join
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-400">No action</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-500">
                    No coaching requests assigned to you yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
