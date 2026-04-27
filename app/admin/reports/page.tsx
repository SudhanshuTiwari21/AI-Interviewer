"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { InterviewReport } from "@/lib/question-engine";
import { buildReportInsights } from "@/lib/report-insights";
import { formatDate } from "@/lib/utils";
import { FileText, Search } from "lucide-react";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return reports;
    return reports.filter(
      (r) =>
        r.candidate.toLowerCase().includes(needle) ||
        r.role.toLowerCase().includes(needle) ||
        r.id.toLowerCase().includes(needle),
    );
  }, [q, reports]);

  const insights = useMemo(() => buildReportInsights(reports), [reports]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Feedback reports"
        description="Candidate interview reports with score breakdown and weak areas."
      />
      <Card>
        <div className="border-b border-ink-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidate, role, report id..."
              className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>
        </div>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-ink-500">
              No reports found.
            </div>
          ) : (
            <ul>
              {filtered.map((r) => {
                const tone = scoreTone(r.overall);
                const insight = insights.get(r.id);
                const noveltyTone = !insight
                  ? "neutral"
                  : insight.noveltyScore >= 70
                    ? "success"
                    : insight.noveltyScore >= 40
                      ? "warn"
                      : "danger";
                const challengeTone = !insight
                  ? "neutral"
                  : insight.challengeDeltaFromPrevious === null
                    ? "neutral"
                    : insight.challengeDeltaFromPrevious >= 0
                      ? "accent"
                      : "warn";
                const challengeDeltaLabel =
                  !insight || insight.challengeDeltaFromPrevious === null
                    ? ""
                    : insight.challengeDeltaFromPrevious >= 0
                      ? ` · +${insight.challengeDeltaFromPrevious}`
                      : ` · ${insight.challengeDeltaFromPrevious}`;
                return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4 last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{r.candidate}</p>
                    <p className="text-xs text-ink-500">
                      {r.role} · {r.level} · {formatDate(r.generatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tone} dot>
                      Score {r.overall}
                    </Badge>
                    {insight && (
                      <>
                        <Badge tone={noveltyTone}>
                          Novelty {insight.noveltyScore}
                        </Badge>
                        <Badge tone={challengeTone}>
                          Challenge {insight.challengeScore}
                          {challengeDeltaLabel}
                        </Badge>
                      </>
                    )}
                    <Link href={`/interview/${r.id}/report`}>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<FileText className="size-3.5" />}
                      >
                        Open
                      </Button>
                    </Link>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function scoreTone(score: number): "success" | "warn" | "danger" {
  if (score >= 80) return "success";
  if (score >= 65) return "warn";
  return "danger";
}
