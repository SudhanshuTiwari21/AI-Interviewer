"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import type { InterviewReport } from "@/lib/question-engine";
import { formatDate } from "@/lib/utils";
import { Search, ExternalLink, Filter } from "lucide-react";

type Row = {
  id: string;
  role: string;
  level: string;
  candidate: string;
  status: "completed" | "in-progress" | "abandoned";
  score: number;
  durationMin: number;
  startedAt: string;
  reportId?: string;
};

export default function AdminSessionsPage() {
  const { has: _has } = useAdmin();
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Row["status"]>("all");
  const [scoreFilter, setScoreFilter] = useState<"all" | "low" | "mid" | "high">(
    "all",
  );

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
  }, []);

  const rows: Row[] = useMemo(() => {
    return reports.map((r) => ({
      id: r.id,
      role: r.role,
      level: r.level,
      candidate: r.candidate,
      status: "completed",
      score: r.overall,
      durationMin: r.durationMin,
      startedAt: r.generatedAt,
      reportId: r.id,
    }));
  }, [reports]);

  const filtered = rows.filter((r) => {
    if (q) {
      const needle = q.toLowerCase();
      if (
        !r.candidate.toLowerCase().includes(needle) &&
        !r.role.toLowerCase().includes(needle) &&
        !r.id.toLowerCase().includes(needle)
      ) {
        return false;
      }
    }
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (scoreFilter !== "all") {
      if (scoreFilter === "low" && r.score >= 60) return false;
      if (scoreFilter === "mid" && (r.score < 60 || r.score >= 80)) return false;
      if (scoreFilter === "high" && r.score < 80) return false;
    }
    return true;
  });

  const avgScore = filtered.length
    ? Math.round(filtered.reduce((s, x) => s + x.score, 0) / filtered.length)
    : 0;
  const avgDuration = filtered.length
    ? Math.round(filtered.reduce((s, x) => s + x.durationMin, 0) / filtered.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Sessions"
        description="Browse every interview run on Selectwise. Open a session to see the full report."
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <Stat label="Total sessions" value={String(filtered.length)} />
        <Stat label="Avg score" value={String(avgScore || "-")} suffix="/100" />
        <Stat label="Avg duration" value={String(avgDuration || "-")} suffix="min" />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidate, role, session id…"
              className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | Row["status"])}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In progress</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <select
            value={scoreFilter}
            onChange={(e) =>
              setScoreFilter(e.target.value as "all" | "low" | "mid" | "high")
            }
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">Any score</option>
            <option value="high">80+ (Strong)</option>
            <option value="mid">60–79 (Hire)</option>
            <option value="low">&lt;60 (Lean / no hire)</option>
          </select>
        </div>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr className="border-b border-ink-100">
                  <Th>Candidate</Th>
                  <Th>Role / Level</Th>
                  <Th>Status</Th>
                  <Th>Score</Th>
                  <Th>Duration</Th>
                  <Th>Started</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink-500">
                      <Filter className="mx-auto mb-2 size-4" />
                      No sessions match these filters.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 50).map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.candidate} size="sm" />
                          <div>
                            <p className="font-medium text-ink-900">{s.candidate}</p>
                            <p className="text-xs text-ink-500">{s.id}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {s.role}
                        <p className="text-xs text-ink-500">{s.level}</p>
                      </Td>
                      <Td>
                        <Badge tone={statusTone(s.status)} dot>
                          {s.status}
                        </Badge>
                      </Td>
                      <Td>
                        {s.status === "completed" ? (
                          <span className="font-semibold text-ink-900">{s.score}</span>
                        ) : (
                          <span className="text-ink-400">-</span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-500">{s.durationMin} min</Td>
                      <Td className="whitespace-nowrap text-xs text-ink-500">
                        {formatDate(s.startedAt)}
                      </Td>
                      <Td className="text-right">
                        {s.reportId ? (
                          <Link href={`/interview/${s.reportId}/report`}>
                            <Button
                              size="sm"
                              variant="outline"
                              rightIcon={<ExternalLink className="size-3.5" />}
                            >
                              Open report
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-400">No report</span>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function statusTone(
  status: Row["status"],
): "success" | "accent" | "neutral" {
  if (status === "completed") return "success";
  if (status === "in-progress") return "accent";
  return "neutral";
}

function Stat({
  label,
  value,
  suffix,
}: Readonly<{ label: string; value: string; suffix?: string }>) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-ink-900">
          {value}
          {suffix && <span className="ml-1 text-sm text-ink-400">{suffix}</span>}
        </p>
      </CardBody>
    </Card>
  );
}

function Th({
  children,
  className,
}: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return (
    <th
      className={`px-5 py-3 text-left font-medium uppercase tracking-wide ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: Readonly<{ children?: React.ReactNode; className?: string }>) {
  return (
    <td className={`px-5 py-4 align-middle text-ink-700 ${className ?? ""}`}>
      {children}
    </td>
  );
}
