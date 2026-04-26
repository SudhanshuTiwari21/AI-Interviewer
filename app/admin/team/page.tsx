"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import {
  canAssignRole,
  hasPermission,
  ROLE_PERMISSIONS,
  roleLabel,
  roleTone,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  UserPlus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type TeamRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
  emailVerified: boolean;
  createdAt: string;
};

const TEAM_ROLES: Role[] = ["super_admin", "admin", "sub_admin"];

export default function AdminTeamPage() {
  const { user: me, has } = useAdmin();
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({
    name: "",
    email: "",
    role: "sub_admin",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await Promise.all(
        TEAM_ROLES.map((r) =>
          fetch(`/api/admin/users?role=${r}&pageSize=100`, { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => (data.ok ? (data.users as TeamRow[]) : [])),
        ),
      );
      setRows(all.flat());
    } catch {
      setError("Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        setSubmitMsg({ type: "err", text: data.message ?? "Invite failed" });
        return;
      }
      setSubmitMsg({
        type: "ok",
        text:
          data.status === "promoted"
            ? `Promoted ${form.email} to ${roleLabel(form.role)}.`
            : `Invitation sent to ${form.email}. They'll verify via email.`,
      });
      setForm({ name: "", email: "", role: "sub_admin" });
      void load();
    } catch {
      setSubmitMsg({ type: "err", text: "Network error." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Admin team"
        description="Invite teammates and assign roles. Each role unlocks a specific set of capabilities."
        actions={
          has("team.invite") && (
            <Button
              size="sm"
              leftIcon={<UserPlus className="size-4" />}
              onClick={() => setInviteOpen(true)}
            >
              Invite teammate
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <p className="text-sm font-semibold text-ink-900">Team members</p>
          </div>
          <CardBody className="p-0">
            {error && (
              <div className="border-b border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
                <AlertTriangle className="mr-2 inline size-4" />
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
              if (rows.length === 0) {
                return (
                  <div className="px-5 py-10 text-center text-sm text-ink-500">
                    No teammates yet. Invite your first admin to get started.
                  </div>
                );
              }
              return (
                <ul>
                {rows.map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {u.name}
                          {u.id === me.id && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-400">
                              You
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-ink-500">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={roleTone(u.role)} dot>
                        {roleLabel(u.role)}
                      </Badge>
                      <Badge tone={u.status === "active" ? "success" : "danger"} dot>
                        {u.status}
                      </Badge>
                      <span className="hidden text-xs text-ink-500 sm:inline">
                        Joined {formatDate(u.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
                </ul>
              );
            })()}
          </CardBody>
        </Card>

        <Card>
          <div className="border-b border-ink-100 px-5 py-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
              <ShieldCheck className="size-4" /> Role capabilities
            </p>
          </div>
          <CardBody className="space-y-4">
            {TEAM_ROLES.map((role) => (
              <RoleCard key={role} role={role} />
            ))}
          </CardBody>
        </Card>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-40">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setInviteOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <p className="text-sm font-semibold text-ink-900">Invite teammate</p>
            <p className="mt-1 text-xs text-ink-500">
              We'll send a verification email. The invitee sets their password via the
              standard sign-in flow.
            </p>
            <form className="mt-4 space-y-3" onSubmit={submitInvite}>
              {submitMsg && (
                <div
                  className={
                    submitMsg.type === "ok"
                      ? "rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700"
                      : "rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700"
                  }
                >
                  {submitMsg.type === "ok" ? (
                    <CheckCircle2 className="mr-2 inline size-4" />
                  ) : (
                    <AlertTriangle className="mr-2 inline size-4" />
                  )}
                  {submitMsg.text}
                </div>
              )}
              <Field label="Full name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                />
              </Field>
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                >
                  {TEAM_ROLES.filter((r) => canAssignRole(me.role, r)).map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}

function RoleCard({ role }: Readonly<{ role: Role }>) {
  const perms = ROLE_PERMISSIONS[role];
  const tone = roleTone(role);
  const counts = perms.length;
  const canSeeAudit = hasPermission(role, "audit.view" as Permission);
  const [expanded, setExpanded] = useState(false);
  const previewCount = 6;
  const hiddenCount = Math.max(0, perms.length - previewCount);
  const visiblePerms = useMemo(
    () => (expanded ? perms : perms.slice(0, previewCount)),
    [expanded, perms],
  );

  return (
    <div className="rounded-xl border border-ink-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <Badge tone={tone} dot>
          {roleLabel(role)}
        </Badge>
        <span className="text-xs text-ink-500">{counts} capabilities</span>
      </div>
      <p className="text-xs text-ink-500">
        {role === "super_admin" &&
          "Full access. Can promote/demote any teammate, change settings, and delete users."}
        {role === "admin" &&
          "Day-to-day operations: manage users, coaches, sessions, bookings. Cannot create other admins or delete users."}
        {role === "sub_admin" &&
          "Read-only support tier. Can view sessions/bookings and reschedule, but cannot mutate users or settings."}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {visiblePerms.map((p) => (
          <span
            key={p}
            className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700"
          >
            {p}
          </span>
        ))}
        {hiddenCount > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600 hover:bg-ink-200"
          >
            +{hiddenCount} more
          </button>
        )}
        {hiddenCount > 0 && expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600 hover:bg-ink-200"
          >
            Show less
          </button>
        )}
        {!canSeeAudit && (
          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[10px] text-warn-700">
            no audit log
          </span>
        )}
      </div>
    </div>
  );
}
