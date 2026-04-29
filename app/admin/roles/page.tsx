"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { AdminPageHeader, useAdmin } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { TARGET_ROLES } from "@/lib/target-roles";

type PublicSettings = {
  targetRoles?: string[];
};

export default function AdminRolesPage() {
  const { has } = useAdmin();
  const canEdit = has("settings.update");
  const [roles, setRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          const saved = (data.settings as PublicSettings)?.targetRoles ?? [];
          const next = saved.length > 0 ? saved : [...TARGET_ROLES];
          setRoles(normalizeRoles(next));
        } else {
          setRoles([...TARGET_ROLES]);
        }
      } catch {
        if (!cancelled) setRoles([...TARGET_ROLES]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(() => roles.length > 0 && canEdit && !saving, [canEdit, roles.length, saving]);

  function addRole() {
    const candidate = newRole.trim();
    if (!candidate) return;
    if (roles.some((r) => r.toLowerCase() === candidate.toLowerCase())) {
      setMsg({ type: "err", text: "Role already exists." });
      return;
    }
    setRoles((prev) => [...prev, candidate]);
    setNewRole("");
    setMsg(null);
  }

  async function saveRoles() {
    if (!canSave) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetRoles: normalizeRoles(roles) }),
      });
      const data = await res.json();
      if (!data.ok) {
        setMsg({ type: "err", text: data.message ?? "Could not save roles." });
        return;
      }
      const saved = (data.settings as PublicSettings)?.targetRoles ?? roles;
      setRoles(normalizeRoles(saved));
      setMsg({ type: "ok", text: "Roles saved successfully." });
    } catch {
      setMsg({ type: "err", text: "Network error while saving roles." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        title="Roles"
        description="Manage one shared list used in interview setup, coaching booking, and admin coach tech areas."
      />

      <Card>
        <CardBody className="space-y-4">
          {msg ? (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                msg.type === "ok"
                  ? "border-success-200 bg-success-50 text-success-700"
                  : "border-danger-200 bg-danger-50 text-danger-700"
              }`}
            >
              {msg.text}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              disabled={!canEdit}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRole();
                }
              }}
              placeholder="Add a role (e.g. Data Engineer)"
              className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
            />
            <Button
              size="sm"
              disabled={!canEdit || !newRole.trim()}
              onClick={addRole}
              leftIcon={<Plus className="size-4" />}
            >
              Add role
            </Button>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white">
            {roles.length === 0 ? (
              <p className="px-3 py-3 text-sm text-ink-500">No roles yet. Add at least one role.</p>
            ) : (
              <div className="max-h-[500px] overflow-auto p-2">
                {roles.map((role, index) => (
                  <div key={`${role}-${index}`} className="mb-2 flex items-center gap-2 last:mb-0">
                    <input
                      disabled={!canEdit}
                      value={role}
                      onChange={(e) =>
                        setRoles((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
                      }
                      className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm disabled:bg-ink-50"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canEdit || roles.length === 1}
                      onClick={() => setRoles((prev) => prev.filter((_, i) => i !== index))}
                      leftIcon={<Trash2 className="size-4" />}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!canSave}
              onClick={() => void saveRoles()}
              leftIcon={<Save className="size-4" />}
            >
              {saving ? "Saving..." : "Save roles"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function normalizeRoles(input: string[]) {
  const map = new Map<string, string>();
  for (const raw of input) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()];
}
