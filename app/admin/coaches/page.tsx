"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import { type Coach } from "@/lib/coaches";
import { cn, uid } from "@/lib/utils";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";

type CoachForm = {
  name: string;
  email: string;
  title: string;
  focus: string;
  techAreas: string;
  hourlyRateInr: string;
  rating: string;
  sessions: string;
  timezone: string;
  weekdays: number[];
  windows: Array<{ startHour: string; endHour: string }>;
  active: boolean;
};

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const DEFAULT_FORM: CoachForm = {
  name: "",
  email: "",
  title: "",
  focus: "",
  techAreas: "",
  hourlyRateInr: "999",
  rating: "4.8",
  sessions: "0",
  timezone: "Asia/Kolkata",
  weekdays: [1, 2, 3, 4, 5],
  windows: [{ startHour: "9", endHour: "10" }, { startHour: "18", endHour: "19" }],
  active: true,
};

export default function AdminCoachesPage() {
  const { has } = useAdmin();
  const canMutate = has("coaches.create") || has("coaches.update");
  const canDelete = has("coaches.delete");

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CoachForm>(DEFAULT_FORM);

  useEffect(() => {
    void fetch("/api/admin/coaches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCoaches(d.coaches);
        else setCoaches([]);
      })
      .catch(() => setCoaches([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Coaches"
        description="Manage coach profiles and availability windows shown to candidates. Session duration is fixed at 30 minutes."
        actions={
          canMutate && (
            <Button
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditingId(null);
                setForm(DEFAULT_FORM);
              }}
            >
              New coach
            </Button>
          )
        }
      />

      <Card>
        <CardBody className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-3">
            {coaches.length === 0 && (
              <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center text-sm text-ink-500">
                No coaches yet. Create one to make them available for booking.
              </div>
            )}
            {coaches.map((coach) => (
              <div key={coach.id} className="rounded-xl border border-ink-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={coach.name} />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {coach.name}
                      </p>
                      <p className="text-xs text-ink-500">{coach.title}</p>
                    </div>
                  </div>
                  <Badge tone={coach.active ? "success" : "neutral"} dot>
                    {coach.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  ★ {coach.rating.toFixed(2)} · {coach.sessions} sessions ·{" "}
                  {coach.timezone} · ₹{coach.hourlyRateInr}/hour
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {coach.focus.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  {coach.techAreas.join(", ")} ·{" "}
                  {weekdaysLabel(coach.availability.weekdays)} · {windowsLabel(coach.availability.windows)}
                </p>
                {canMutate && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Pencil className="size-3.5" />}
                      onClick={() => {
                        setEditingId(coach.id);
                        setForm({
                          name: coach.name,
                          email: coach.email,
                          title: coach.title,
                          focus: coach.focus.join(", "),
                          techAreas: coach.techAreas.join(", "),
                          hourlyRateInr: String(coach.hourlyRateInr),
                          rating: String(coach.rating),
                          sessions: String(coach.sessions),
                          timezone: coach.timezone,
                          weekdays: coach.availability.weekdays,
                          windows:
                            coach.availability.windows?.map((w) => ({
                              startHour: String(w.startHour),
                              endHour: String(w.endHour),
                            })) ?? [{ startHour: "9", endHour: "10" }],
                          active: coach.active,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 className="size-3.5" />}
                        className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                        onClick={() => {
                          if (!confirm(`Delete ${coach.name}?`)) return;
                          void fetch(`/api/admin/coaches?id=${encodeURIComponent(coach.id)}`, {
                            method: "DELETE",
                          });
                          setCoaches((prev) => prev.filter((x) => x.id !== coach.id));
                          if (editingId === coach.id) {
                            setEditingId(null);
                            setForm(DEFAULT_FORM);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canMutate ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = toCoach(form, editingId);
                if (!next) return;
                void fetch("/api/admin/coaches", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(next),
                });
                setCoaches((prev) => {
                  const idx = prev.findIndex((c) => c.id === next.id);
                  if (idx === -1) return [next, ...prev];
                  const copy = [...prev];
                  copy[idx] = next;
                  return copy;
                });
                setEditingId(next.id);
              }}
              className="space-y-3 rounded-xl border border-ink-200 bg-ink-50/40 p-4"
            >
              <p className="text-sm font-semibold text-ink-900">
                {editingId ? "Edit coach" : "Create coach"}
              </p>
              <Field label="Name">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Title">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Focus areas (comma separated)">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.focus}
                  onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Tech areas (comma separated)">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.techAreas}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, techAreas: e.target.value }))
                  }
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Rating">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.01"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.rating}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rating: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Sessions">
                  <input
                    type="number"
                    min="0"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.sessions}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sessions: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Hourly rate (INR)">
                  <input
                    type="number"
                    min="1"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.hourlyRateInr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hourlyRateInr: e.target.value }))
                    }
                  />
                </Field>
              </div>
              <Field label="Timezone">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timezone: e.target.value }))
                  }
                />
              </Field>
              <Field label="Work days">
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = form.weekdays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            weekdays: active
                              ? f.weekdays.filter((x) => x !== d.value)
                              : [...f.weekdays, d.value].sort((a, b) => a - b),
                          }))
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs",
                          active
                            ? "border-ink-900 bg-ink-900 text-white"
                            : "border-ink-200 bg-white text-ink-700",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Availability windows">
                <div className="space-y-2">
                  {form.windows.map((win, idx) => (
                    <div key={`${idx}-${win.startHour}-${win.endHour}`} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                      <input
                        type="number"
                        min="0"
                        max="23"
                        className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                        value={win.startHour}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            windows: f.windows.map((w, i) =>
                              i === idx ? { ...w, startHour: e.target.value } : w,
                            ),
                          }))
                        }
                        placeholder="Start hour"
                      />
                      <input
                        type="number"
                        min="1"
                        max="24"
                        className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                        value={win.endHour}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            windows: f.windows.map((w, i) =>
                              i === idx ? { ...w, endHour: e.target.value } : w,
                            ),
                          }))
                        }
                        placeholder="End hour"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={form.windows.length === 1}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            windows: f.windows.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        windows: [...f.windows, { startHour: "9", endHour: "10" }],
                      }))
                    }
                  >
                    Add time window
                  </Button>
                </div>
              </Field>
              <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                <span>Active coach</span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" type="submit" leftIcon={<Save className="size-3.5" />}>
                  {editingId ? "Save coach" : "Create coach"}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(DEFAULT_FORM);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/40 p-6 text-center text-sm text-ink-500">
              You have view-only access. Contact a Super Admin to edit coaches.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function weekdaysLabel(days: number[]) {
  const labels = WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.label);
  return labels.join(", ") || "No days";
}

function toHourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
}

function toCoach(form: CoachForm, editingId: string | null): Coach | null {
  if (!form.name.trim() || !form.title.trim() || form.weekdays.length === 0) return null;
  if (!form.email.trim()) return null;
  const windows = form.windows
    .map((w) => ({ startHour: Number(w.startHour), endHour: Number(w.endHour) }))
    .filter(
      (w) =>
        !Number.isNaN(w.startHour) &&
        !Number.isNaN(w.endHour) &&
        w.startHour >= 0 &&
        w.endHour <= 24 &&
        w.startHour < w.endHour,
    );
  if (windows.length === 0) return null;
  const focus = form.focus
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const techAreas = form.techAreas
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    id: editingId ?? uid("coach"),
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    title: form.title.trim(),
    focus,
    techAreas,
    hourlyRateInr: Number(form.hourlyRateInr) || 999,
    rating: Number(form.rating) || 4.8,
    sessions: Number(form.sessions) || 0,
    timezone: form.timezone.trim() || "Asia/Kolkata",
    active: form.active,
    availability: {
      weekdays: [...form.weekdays].sort((a, b) => a - b),
      windows,
    },
  };
}

function windowsLabel(windows: Array<{ startHour: number; endHour: number }>) {
  if (!windows || windows.length === 0) return "No windows";
  return windows.map((w) => `${toHourLabel(w.startHour)}-${toHourLabel(w.endHour)}`).join(", ");
}
