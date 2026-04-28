"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAdmin, AdminPageHeader } from "@/components/admin/AdminShell";
import { type Coach } from "@/lib/coaches";
import { TARGET_ROLES } from "@/lib/target-roles";
import { cn, uid } from "@/lib/utils";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";

type CoachForm = {
  name: string;
  email: string;
  title: string;
  description: string;
  focus: string;
  techAreas: string[];
  hourlyRateInr: string;
  sessions: string;
  timezone: string;
  weekdays: number[];
  windows: Array<{ startMinute: string; endMinute: string }>;
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
  description: "",
  focus: "",
  techAreas: [],
  hourlyRateInr: "999",
  sessions: "0",
  timezone: "Asia/Kolkata",
  weekdays: [1, 2, 3, 4, 5],
  windows: [
    { startMinute: "09:00", endMinute: "10:00" },
    { startMinute: "18:00", endMinute: "19:00" },
  ],
  active: true,
};

export default function AdminCoachesPage() {
  const { has } = useAdmin();
  const canMutate = has("coaches.create") || has("coaches.update");
  const canDelete = has("coaches.delete");

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CoachForm>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const formAlertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch("/api/admin/coaches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCoaches(d.coaches);
        else setCoaches([]);
      })
      .catch(() => setCoaches([]));
  }, []);

  useEffect(() => {
    if (!saveMessage && !saveError) return;
    formAlertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [saveError, saveMessage]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Coaches"
        description="Manage coach profiles and availability windows shown to candidates."
        actions={
          canMutate && (
            <Button
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => {
                setEditingId(null);
                setForm(DEFAULT_FORM);
                setSaveMessage(null);
                setSaveError(null);
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
                  ★ {coach.rating.toFixed(2)} ({coach.reviewCount ?? 0} reviews) · {coach.sessions} sessions ·{" "}
                  {coach.timezone} · ₹{coach.hourlyRateInr}/hour
                </p>
                {coach.description ? (
                  <p className="mt-2 text-xs text-ink-600">{coach.description}</p>
                ) : null}
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
                {coach.recentFeedbacks && coach.recentFeedbacks.length > 0 ? (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-ink-100 bg-ink-50/50 p-2">
                    {coach.recentFeedbacks.slice(0, 3).map((feedback) => (
                      <p
                        key={`${feedback.createdAt}-${feedback.candidateName}`}
                        className="text-[11px] text-ink-600"
                      >
                        <span className="font-medium text-ink-700">
                          {feedback.rating.toFixed(1)}★ · {feedback.candidateName}
                        </span>{" "}
                        {feedback.feedbackText}
                      </p>
                    ))}
                  </div>
                ) : null}
                {canMutate && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Pencil className="size-3.5" />}
                      onClick={() => {
                        setEditingId(coach.id);
                        setSaveMessage(null);
                        setSaveError(null);
                        setForm({
                          name: coach.name,
                          email: coach.email,
                          title: coach.title,
                          description: coach.description ?? "",
                          focus: coach.focus.join(", "),
                          techAreas: coach.techAreas,
                          hourlyRateInr: String(coach.hourlyRateInr),
                          sessions: String(coach.sessions),
                          timezone: coach.timezone,
                          weekdays: coach.availability.weekdays,
                          windows:
                            coach.availability.windows?.map((w) => ({
                              startMinute: toTimeValue(w.startMinute),
                              endMinute: toTimeValue(w.endMinute),
                            })) ?? [{ startMinute: "09:00", endMinute: "10:00" }],
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
              onSubmit={async (e) => {
                e.preventDefault();
                setSaveMessage(null);
                setSaveError(null);
                const next = toCoach(form, editingId);
                if (!next) return;
                setIsSaving(true);
                try {
                  const res = await fetch("/api/admin/coaches", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(next),
                  });
                  const data = await res.json();
                  if (!data.ok) {
                    setSaveError(data.message ?? "Could not save coach.");
                    return;
                  }
                  setCoaches((prev) => {
                    const idx = prev.findIndex((c) => c.id === next.id);
                    if (idx === -1) return [next, ...prev];
                    const copy = [...prev];
                    copy[idx] = next;
                    return copy;
                  });
                  setEditingId(null);
                  setForm(DEFAULT_FORM);
                  setSaveMessage("Coach saved successfully.");
                  setTimeout(() => setSaveMessage(null), 3000);
                } catch {
                  setSaveError("Could not save coach.");
                } finally {
                  setIsSaving(false);
                }
              }}
              className="space-y-3 rounded-xl border border-ink-200 bg-ink-50/40 p-4"
            >
              <p className="text-sm font-semibold text-ink-900">
                {editingId ? "Edit coach" : "Create coach"}
              </p>
              {saveMessage ? (
                <p
                  ref={formAlertRef}
                  className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-xs text-success-700"
                >
                  {saveMessage}
                </p>
              ) : null}
              {saveError ? (
                <p
                  ref={formAlertRef}
                  className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700"
                >
                  {saveError}
                </p>
              ) : null}
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
              <Field label="Description">
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief coach bio and expertise summary"
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
              <Field label="Tech areas">
                <div className="max-h-44 overflow-y-auto rounded-lg border border-ink-200 bg-white p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {TARGET_ROLES.map((role) => {
                      const active = form.techAreas.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              techAreas: active
                                ? f.techAreas.filter((item) => item !== role)
                                : [...f.techAreas, role],
                            }))
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs",
                            active
                              ? "border-ink-900 bg-ink-900 text-white"
                              : "border-ink-200 bg-white text-ink-700",
                          )}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2">
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
                    <div key={`${idx}-${win.startMinute}-${win.endMinute}`} className="grid grid-cols-[1fr,1fr,auto] gap-2">
                      <input
                        type="time"
                        step="60"
                        className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                        value={win.startMinute}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            windows: f.windows.map((w, i) =>
                              i === idx ? { ...w, startMinute: e.target.value } : w,
                            ),
                          }))
                        }
                        placeholder="Start time"
                      />
                      <input
                        type="time"
                        step="60"
                        className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                        value={win.endMinute}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            windows: f.windows.map((w, i) =>
                              i === idx ? { ...w, endMinute: e.target.value } : w,
                            ),
                          }))
                        }
                        placeholder="End time"
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
                        windows: [...f.windows, { startMinute: "09:00", endMinute: "10:00" }],
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
                <Button
                  size="sm"
                  type="submit"
                  disabled={isSaving}
                  leftIcon={<Save className="size-3.5" />}
                >
                  {isSaving ? "Saving..." : editingId ? "Save coach" : "Create coach"}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(DEFAULT_FORM);
                    setSaveMessage(null);
                    setSaveError(null);
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

function toTimeValue(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeToMinutes(value: string) {
  const [hourPart, minutePart] = value.split(":");
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return Number.NaN;
  }
  return hours * 60 + minutes;
}

function toHourMinuteLabel(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function toCoach(form: CoachForm, editingId: string | null): Coach | null {
  if (!form.name.trim() || !form.title.trim() || form.weekdays.length === 0) return null;
  if (!form.email.trim()) return null;
  if (form.techAreas.length === 0) return null;
  const windows = form.windows
    .map((w) => ({
      startMinute: parseTimeToMinutes(w.startMinute),
      endMinute: parseTimeToMinutes(w.endMinute),
    }))
    .filter(
      (w) =>
        !Number.isNaN(w.startMinute) &&
        !Number.isNaN(w.endMinute) &&
        w.startMinute >= 0 &&
        w.endMinute <= 23 * 60 + 59 &&
        w.startMinute < w.endMinute,
    );
  if (windows.length === 0) return null;
  const focus = form.focus
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const techAreas = form.techAreas;
  return {
    id: editingId ?? uid("coach"),
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    title: form.title.trim(),
    description: form.description.trim(),
    focus,
    techAreas,
    hourlyRateInr: Number(form.hourlyRateInr) || 999,
    rating: 0,
    sessions: Number(form.sessions) || 0,
    timezone: form.timezone.trim() || "Asia/Kolkata",
    active: form.active,
    availability: {
      weekdays: [...form.weekdays].sort((a, b) => a - b),
      windows,
    },
  };
}

function windowsLabel(windows: Array<{ startMinute: number; endMinute: number }>) {
  if (!windows || windows.length === 0) return "No windows";
  return windows
    .map((w) => `${toHourMinuteLabel(w.startMinute)}-${toHourMinuteLabel(w.endMinute)}`)
    .join(", ");
}
