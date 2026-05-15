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
    <div className="container max-w-6xl overflow-x-hidden px-4 py-8 sm:py-10 lg:overflow-x-visible">
      <PageHeader
        title="Reports"
        description="Every interview you've completed, scored and downloadable."
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
              Run your first interview to generate one.
            </p>
            <div className="mt-5">
              <Button href="/interview/setup">Start interview</Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Mobile: card list (avoids wide table breaking the bottom nav) */}
            <ul className="space-y-3 lg:hidden">
              {reports.map((r) => {
                const insight = insights.get(r.id);
                const challengeDelta = insight?.challengeDeltaFromPrevious;
                const challengeDeltaLabel =
                  challengeDelta === null || challengeDelta === undefined
                    ? null
                    : `${challengeDelta > 0 ? "+" : ""}${challengeDelta}`;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/interview/${r.id}/report`}
                      className="block rounded-2xl border border-ink-200 bg-white p-4 shadow-soft transition-colors hover:border-ink-300 hover:bg-ink-50/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-ink-900">{r.role}</p>
                          <p className="text-xs text-ink-500">{r.level}</p>
                        </div>
                        <Badge tone={toneForRating(r.rating)} dot>
                          {r.rating}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-ink-600">
                        <div>
                          <dt className="text-ink-400">Date</dt>
                          <dd className="mt-0.5 font-medium text-ink-800">
                            {formatDate(r.generatedAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Duration</dt>
                          <dd className="mt-0.5 font-medium text-ink-800">
                            {r.durationMin} min
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Score</dt>
                          <dd className="mt-0.5 font-semibold text-ink-900">{r.overall}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Questions</dt>
                          <dd className="mt-0.5 font-medium text-ink-800">
                            {r.perQuestion.length}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Novelty</dt>
                          <dd className="mt-0.5 font-medium text-ink-800">
                            {insight?.noveltyScore ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Challenge</dt>
                          <dd className="mt-0.5 font-medium text-ink-800">
                            {insight?.challengeScore ?? "—"}
                            {challengeDeltaLabel !== null ? (
                              <span className="text-ink-500"> ({challengeDeltaLabel})</span>
                            ) : null}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-3 flex items-center gap-1 text-xs font-medium text-accent-700">
                        View report
                        <ArrowRight className="size-3.5" />
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: full table (unchanged layout) */}
            <Card className="hidden lg:block">
              <div className="overflow-x-auto">
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
              </div>
            </Card>
          </>
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
