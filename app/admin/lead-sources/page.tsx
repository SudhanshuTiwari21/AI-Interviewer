"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

type UserRow = {
  id: string;
  leadSource?: string;
};

export default function AdminLeadSourcesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    void fetch("/api/admin/users?pageSize=300", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setUsers(d.users);
      });
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((u) => {
      const source = (u.leadSource ?? "direct").trim().toLowerCase() || "direct";
      map.set(source, (map.get(source) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const total = Math.max(users.length, 1);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Lead source tracking"
        description="Signup acquisition split by source (utm_source/source/direct)."
      />
      <Card>
        <CardBody className="space-y-4">
          {rows.length === 0 && (
            <p className="text-sm text-ink-500">No signup source data yet.</p>
          )}
          {rows.map((r) => {
            const pct = Math.round((r.count / total) * 100);
            return (
              <div key={r.source}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-ink-700">{r.source}</span>
                  <span className="font-medium text-ink-900">
                    {r.count} ({pct}%)
                  </span>
                </div>
                <Progress value={pct} tone="success" />
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
