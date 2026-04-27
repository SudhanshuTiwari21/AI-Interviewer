"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { store } from "@/lib/store";
import type { InterviewReport } from "@/lib/question-engine";
import { buildReportInsights } from "@/lib/report-insights";
import { formatDate } from "@/lib/utils";
import { Mic, ArrowRight } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const insights = useMemo(() => buildReportInsights(reports), [reports]);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
        else setReports(store.getReports());
      })
      .catch(() => setReports(store.getReports()));
  }, []);

  return (
    <div className="container max-w-6xl px-4 py-8 sm:py-10">
      <PageHeader
        title="Reports"
        description="Every mock you've completed, scored and downloadable."
        actions={
          <Button
            href="/interview/setup"
            leftIcon={<Mic className="size-4" />}
          >
            New interview
          </Button>
        }
      />
      <div className="mt-8">
        {reports.length === 0 ? (
          <Card className="p-14 text-center">
            <p className="text-sm font-medium text-ink-900">No reports yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Run your first mock interview to generate one.
            </p>
            <div className="mt-5">
              <Button href="/interview/setup">Start interview</Button>
            </div>
          </Card>
        ) : (
          <Card>
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 text-xs text-ink-500">
                <tr>
                  <Th>Role</Th>
                  <Th>Date</Th>
                  <Th>Duration</Th>
                  <Th>Questions</Th>
                  <Th>Score</Th>
                  <Th>Novelty</Th>
                  <Th>Challenge</Th>
                  <Th>Rating</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const insight = insights.get(r.id);
                  const ratingTone = toneForRating(r.rating);
                  const challengeDelta = insight?.challengeDeltaFromPrevious;
                  const challengeDeltaLabel =
                    challengeDelta === null || challengeDelta === undefined
                      ? null
                      : `${challengeDelta > 0 ? "+" : ""}${challengeDelta}`;
                  return (
                  <tr
                    key={r.id}
                    className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                  >
                    <Td>
                      <p className="font-medium text-ink-900">{r.role}</p>
                      <p className="text-xs text-ink-500">{r.level}</p>
                    </Td>
                    <Td>{formatDate(r.generatedAt)}</Td>
                    <Td>{r.durationMin} min</Td>
                    <Td>{r.perQuestion.length}</Td>
                    <Td>
                      <span className="font-semibold text-ink-900">
                        {r.overall}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-ink-900">
                        {insight?.noveltyScore ?? "-"}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-semibold text-ink-900">
                        {insight?.challengeScore ?? "-"}
                      </span>
                      {challengeDeltaLabel !== null && (
                          <span className="ml-1 text-xs text-ink-500">
                            ({challengeDeltaLabel})
                          </span>
                        )}
                    </Td>
                    <Td>
                      <Badge tone={ratingTone} dot>
                        {r.rating}
                      </Badge>
                    </Td>
                    <Td>
                      <Link
                        href={`/interview/${r.id}/report`}
                        className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      >
                        <ArrowRight className="size-4" />
                      </Link>
                    </Td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-5 py-3 text-left font-medium uppercase tracking-wide">
      {children}
    </th>
  );
}
function Td({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <td className="px-5 py-4 align-middle text-ink-700">{children}</td>;
}

function toneForRating(rating: InterviewReport["rating"]): "success" | "accent" | "warn" | "danger" {
  if (rating === "Strong hire") return "success";
  if (rating === "Hire") return "accent";
  if (rating === "Lean hire") return "warn";
  return "danger";
}
