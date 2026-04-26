"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import { roleLabel, roleTone, type Role } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import { Loader2, RefreshCw, ScrollText, Search } from "lucide-react";

type AuditRow = {
  id: string;
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
};

const ACTION_TONE: Record<string, "neutral" | "accent" | "success" | "warn" | "danger"> =
  {
    "user.update": "accent",
    "user.delete": "danger",
    "team.invite": "success",
    "team.promote": "accent",
    "settings.update": "warn",
  };

export default function AdminAuditPage() {
  const { has: _has } = useAdmin();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/audit?limit=200", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Failed to load audit log");
        return;
      }
      setRows(data.logs);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (actionFilter !== "all" && r.action !== actionFilter) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !r.actorEmail.toLowerCase().includes(needle) &&
        !r.action.toLowerCase().includes(needle) &&
        !(r.targetId ?? "").toLowerCase().includes(needle)
      )
        return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Audit log"
        description="Every privileged action taken by an admin, in reverse chronological order."
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="size-3.5" />}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by actor email, action, target id…"
              className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <CardBody className="p-0">
          {error && (
            <div className="border-b border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {error}
            </div>
          )}
          {(() => {
            if (loading) {
              return (
                <div className="px-5 py-10 text-center text-ink-500">
                  <Loader2 className="mx-auto size-4 animate-spin" />
                </div>
              );
            }
            if (filtered.length === 0) {
              return (
                <div className="px-5 py-10 text-center text-sm text-ink-500">
                  <ScrollText className="mx-auto mb-2 size-5" />
                  No audit entries match these filters.
                </div>
              );
            }
            return (
              <ul>
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 last:border-0 hover:bg-ink-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={ACTION_TONE[r.action] ?? "neutral"} dot>
                        {r.action}
                      </Badge>
                      <Badge tone={roleTone(r.actorRole as Role)} dot>
                        {roleLabel(r.actorRole as Role)}
                      </Badge>
                      <span className="text-xs text-ink-500">{r.actorEmail}</span>
                    </div>
                    {r.targetType && (
                      <p className="mt-1 text-xs text-ink-500">
                        target: {r.targetType}
                        {r.targetId ? ` (${r.targetId.slice(0, 8)}…)` : ""}
                      </p>
                    )}
                    {Object.keys(r.metadata ?? {}).length > 0 && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-ink-50 p-2 text-[11px] text-ink-700">
                        {JSON.stringify(r.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-ink-500">
                    {formatDate(r.createdAt)}
                  </span>
                </li>
              ))}
              </ul>
            );
          })()}
        </CardBody>
      </Card>
    </div>
  );
}
