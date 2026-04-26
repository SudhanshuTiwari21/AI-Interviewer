"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import {
  canActOnRole,
  canAssignRole,
  roleLabel,
  roleTone,
  type Role,
} from "@/lib/auth/permissions";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Trash2,
  UserMinus,
  UserCheck,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  leadSource?: string;
  plan: string;
  status: "active" | "suspended";
  emailVerified: boolean;
  createdAt: string;
};

const ROLE_OPTIONS: Role[] = ["super_admin", "admin", "sub_admin", "coach", "user"];

export default function AdminUsersPage() {
  const { user: me, has } = useAdmin();
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Failed to load users");
        setRows([]);
        return;
      }
      setRows(data.users);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
      setError("Network error loading users.");
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Users"
        description="Search candidates and admins, change roles, suspend accounts."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load()}
            leftIcon={<RefreshCw className="size-3.5" />}
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
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by email or name…"
              className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | "all");
              setPage(1);
            }}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "suspended");
              setPage(1);
            }}
            className="h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <CardBody className="p-0">
          {error && (
            <div className="border-b border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <AlertTriangle className="mr-2 inline size-4" />
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr className="border-b border-ink-100">
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Verified</Th>
                  <Th>Lead source</Th>
                  <Th>Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink-500">
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink-500">
                      No users match these filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((u) => {
                    const canEdit =
                      u.id !== me.id &&
                      (has("users.update") || has("users.suspend")) &&
                      canActOnRole(me.role, u.role);
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">
                                {u.name}
                                {u.id === me.id && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-400">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-ink-500">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <Badge tone={roleTone(u.role)} dot>
                            {roleLabel(u.role)}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge
                            tone={u.status === "active" ? "success" : "danger"}
                            dot
                          >
                            {u.status}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge tone={u.emailVerified ? "success" : "warn"} dot>
                            {u.emailVerified ? "verified" : "pending"}
                          </Badge>
                        </Td>
                        <Td className="text-xs text-ink-500">{u.leadSource ?? "direct"}</Td>
                        <Td className="whitespace-nowrap text-xs text-ink-500">
                          {formatDate(u.createdAt)}
                        </Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditing(u)}
                              >
                                Manage
                              </Button>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
            <span>
              {total === 0
                ? "0 users"
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(
                    page * pageSize,
                    total,
                  )} of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span>
                {page}/{totalPages}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {editing && (
        <ManageUserDrawer
          user={editing}
          actorRole={me.role}
          actorId={me.id}
          onClose={() => setEditing(null)}
          onChanged={() => {
            void load();
          }}
        />
      )}
    </div>
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

function ManageUserDrawer({
  user,
  actorRole,
  actorId,
  onClose,
  onChanged,
}: Readonly<{
  user: AdminUserRow;
  actorRole: Role;
  actorId: string;
  onClose: () => void;
  onChanged: () => void;
}>) {
  const [role, setRole] = useState<Role>(user.role);
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSelf = user.id === actorId;

  const assignableRoles = useMemo(
    () => ROLE_OPTIONS.filter((r) => r === user.role || canAssignRole(actorRole, r)),
    [actorRole, user.role],
  );

  async function patch(payload: Record<string, unknown>, action: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Update failed");
        return false;
      }
      onChanged();
      return true;
    } catch {
      setError("Network error.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Delete failed");
        return;
      }
      onChanged();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-ink-900/40"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Manage user</p>
            <p className="text-xs text-ink-500">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{user.name}</p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
          </div>

          <Section title="Profile">
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
              />
            </Field>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || name === user.name || !name.trim()}
              onClick={() => void patch({ name: name.trim() }, "name")}
            >
              {busy === "name" ? "Saving…" : "Save name"}
            </Button>
          </Section>

          <Section title="Role">
            <Field label="Assigned role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={isSelf}
                className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </Field>
            {isSelf ? (
              <p className="text-xs text-ink-500">You cannot change your own role.</p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null || role === user.role}
                onClick={() => void patch({ role }, "role")}
              >
                {busy === "role" ? "Saving…" : "Update role"}
              </Button>
            )}
          </Section>

          <Section title="Status">
            <p className="text-xs text-ink-500">
              Suspended users cannot log in or access their dashboard until reactivated.
            </p>
            <div className="flex flex-wrap gap-2">
              {user.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null || isSelf}
                  leftIcon={<UserMinus className="size-3.5" />}
                  className="text-danger-700 hover:bg-danger-50"
                  onClick={() => void patch({ status: "suspended" }, "suspend")}
                >
                  {busy === "suspend" ? "Suspending…" : "Suspend account"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  leftIcon={<UserCheck className="size-3.5" />}
                  onClick={() => void patch({ status: "active" }, "reactivate")}
                >
                  {busy === "reactivate" ? "Reactivating…" : "Reactivate account"}
                </Button>
              )}
            </div>
          </Section>

          <Section title="Danger zone">
            <p className="text-xs text-ink-500">
              Permanently deletes the account and all associated data. This cannot be undone.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null || isSelf}
              leftIcon={<Trash2 className="size-3.5" />}
              className="text-danger-700 hover:bg-danger-50"
              onClick={() => void remove()}
            >
              {busy === "delete" ? "Deleting…" : "Delete user"}
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {title}
      </p>
      {children}
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
