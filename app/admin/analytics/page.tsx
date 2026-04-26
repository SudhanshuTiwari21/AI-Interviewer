"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import type { InterviewReport } from "@/lib/question-engine";

const FRESHER_LEVELS = new Set(["Junior", "Mid"]);

export default function AdminFreshersProsPage() {
  const [reports, setReports] = useState<InterviewReport[]>([]);

  useEffect(() => {
    void fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setReports(d.reports);
      });
  }, []);

  const stats = useMemo(() => {
    const freshers = reports.filter((r) => FRESHER_LEVELS.has(r.level)).length;
    const professionals = reports.length - freshers;
    const total = Math.max(reports.length, 1);
    const fresherPct = Math.round((freshers / total) * 100);
    const proPct = Math.round((professionals / total) * 100);
    const fresherAvg = averageScore(reports.filter((r) => FRESHER_LEVELS.has(r.level)));
    const proAvg = averageScore(reports.filter((r) => !FRESHER_LEVELS.has(r.level)));
    return { freshers, professionals, fresherPct, proPct, fresherAvg, proAvg };
  }, [reports]);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Freshers vs Professionals analytics"
        description="Population and performance split by candidate seniority bucket."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Population mix</p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Freshers</span>
                  <span>{stats.fresherPct}%</span>
                </div>
                <Progress value={stats.fresherPct} tone="accent" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Professionals</span>
                  <span>{stats.proPct}%</span>
                </div>
                <Progress value={stats.proPct} tone="success" />
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm font-semibold text-ink-900">Average scores</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Freshers" value={String(stats.fresherAvg || 0)} />
              <Metric label="Professionals" value={String(stats.proAvg || 0)} />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function averageScore(items: InterviewReport[]) {
  if (items.length === 0) return 0;
  return Math.round(items.reduce((sum, x) => sum + x.overall, 0) / items.length);
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
