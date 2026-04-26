"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { store } from "@/lib/store";
import { type Coach } from "@/lib/coaches";
import { RECENT_SESSIONS } from "@/lib/mock-data";
import type { InterviewReport } from "@/lib/question-engine";
import { cn, formatDate, formatCurrency, uid } from "@/lib/utils";
import {
  ArrowLeft,
  Users,
  DollarSign,
  Activity,
  ListChecks,
  TrendingUp,
  Plus,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";

type CoachForm = {
  name: string;
  title: string;
  focus: string;
  rating: string;
  sessions: string;
  timezone: string;
  weekdays: number[];
  startHour: string;
  endHour: string;
  intervalMin: string;
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
  title: "",
  focus: "",
  rating: "4.8",
  sessions: "0",
  timezone: "Asia/Kolkata",
  weekdays: [1, 2, 3, 4, 5],
  startHour: "9",
  endHour: "18",
  intervalMin: "30",
  active: true,
};

export default function AdminPage() {
  const router = useRouter();
  const [reports, setReports] = useState<InterviewReport[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CoachForm>(DEFAULT_FORM);

  useEffect(() => {
    const user = store.getUser();
    if (!user) {
      router.replace("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setReports(store.getReports());
    setCoaches(store.getCoaches());
  }, [router]);

  const allSessions = [
    ...reports.map((r) => ({
      id: r.id,
      role: r.role,
      level: r.level,
      candidate: r.candidate,
      status: "completed" as const,
      score: r.overall,
      durationMin: r.durationMin,
      startedAt: r.generatedAt,
    })),
    ...RECENT_SESSIONS,
  ];

  const completed = allSessions.filter((s) => s.status === "completed");
  const avgScore = completed.length
    ? Math.round(
        completed.reduce((s, x) => s + x.score, 0) / completed.length,
      )
    : 0;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge tone="accent" dot>
              Admin
            </Badge>
          </div>
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
          >
            Back
          </Button>
        </div>
      </header>
      <main className="container max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Operations
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Snapshot of platform activity in the last 7 days.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Users}
            label="Active candidates"
            value={String(allSessions.length)}
            delta="+12% WoW"
          />
          <Stat
            icon={Activity}
            label="Sessions run"
            value={String(allSessions.length)}
            delta="+18% WoW"
          />
          <Stat
            icon={TrendingUp}
            label="Avg score"
            value={String(avgScore || "-")}
            delta="+3 pts"
          />
          <Stat
            icon={DollarSign}
            label="Revenue (week)"
            value={formatCurrency(allSessions.length * 299, "INR")}
            delta="+24%"
          />
        </div>

        <Card className="mt-8">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <p className="text-sm font-semibold text-ink-900">
              Coaches · CRUD & availability
            </p>
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
          </div>
          <CardBody className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-3">
              {coaches.map((coach) => (
                <div key={coach.id} className="rounded-xl border border-ink-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={coach.name} />
                      <div>
                        <p className="text-sm font-semibold text-ink-900">{coach.name}</p>
                        <p className="text-xs text-ink-500">{coach.title}</p>
                      </div>
                    </div>
                    <Badge tone={coach.active ? "success" : "neutral"} dot>
                      {coach.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-ink-500">
                    ★ {coach.rating.toFixed(2)} · {coach.sessions} sessions · {coach.timezone}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {coach.focus.map((f) => (
                      <span key={f} className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-500">
                    {weekdaysLabel(coach.availability.weekdays)} · {toHourLabel(coach.availability.startHour)}-{toHourLabel(coach.availability.endHour)} · every {coach.availability.intervalMin}m
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Pencil className="size-3.5" />}
                      onClick={() => {
                        setEditingId(coach.id);
                        setForm({
                          name: coach.name,
                          title: coach.title,
                          focus: coach.focus.join(", "),
                          rating: String(coach.rating),
                          sessions: String(coach.sessions),
                          timezone: coach.timezone,
                          weekdays: coach.availability.weekdays,
                          startHour: String(coach.availability.startHour),
                          endHour: String(coach.availability.endHour),
                          intervalMin: String(coach.availability.intervalMin),
                          active: coach.active,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Trash2 className="size-3.5" />}
                      className="text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      onClick={() => {
                        store.deleteCoach(coach.id);
                        setCoaches(store.getCoaches());
                        if (editingId === coach.id) {
                          setEditingId(null);
                          setForm(DEFAULT_FORM);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = toCoach(form, editingId);
                if (!next) return;
                store.upsertCoach(next);
                setCoaches(store.getCoaches());
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
              <div className="grid grid-cols-2 gap-2">
                <Field label="Rating">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.01"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  />
                </Field>
                <Field label="Sessions">
                  <input
                    type="number"
                    min="0"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.sessions}
                    onChange={(e) => setForm((f) => ({ ...f, sessions: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Timezone">
                <input
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
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
              <div className="grid grid-cols-3 gap-2">
                <Field label="Start">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.startHour}
                    onChange={(e) => setForm((f) => ({ ...f, startHour: e.target.value }))}
                  />
                </Field>
                <Field label="End">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.endHour}
                    onChange={(e) => setForm((f) => ({ ...f, endHour: e.target.value }))}
                  />
                </Field>
                <Field label="Every">
                  <select
                    className="h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm"
                    value={form.intervalMin}
                    onChange={(e) => setForm((f) => ({ ...f, intervalMin: e.target.value }))}
                  >
                    <option value="15">15m</option>
                    <option value="30">30m</option>
                    <option value="60">60m</option>
                  </select>
                </Field>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
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
          </CardBody>
        </Card>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <Card>
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <p className="text-sm font-semibold text-ink-900">
                Recent sessions
              </p>
              <Badge tone="neutral" dot>
                Live
              </Badge>
            </div>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500">
                  <tr className="border-b border-ink-100">
                    <Th>Candidate</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Score</Th>
                    <Th>Started</Th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.slice(0, 8).map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60"
                    >
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={s.candidate} size="sm" />
                          <div>
                            <p className="font-medium text-ink-900">
                              {s.candidate}
                            </p>
                            <p className="text-xs text-ink-500">{s.id}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {s.role}
                        <p className="text-xs text-ink-500">{s.level}</p>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            s.status === "completed"
                              ? "success"
                              : s.status === "in-progress"
                                ? "accent"
                                : "neutral"
                          }
                          dot
                        >
                          {s.status}
                        </Badge>
                      </Td>
                      <Td>
                        {s.status === "completed" ? (
                          <span className="font-semibold text-ink-900">
                            {s.score}
                          </span>
                        ) : (
                          <span className="text-ink-400">-</span>
                        )}
                      </Td>
                      <Td className="text-xs text-ink-500">
                        {formatDate(s.startedAt)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <div className="space-y-6">
            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  Score distribution
                </p>
              </div>
              <CardBody className="space-y-3">
                {[
                  ["Strong hire", "success", 18],
                  ["Hire", "accent", 42],
                  ["Lean hire", "warn", 26],
                  ["No hire", "danger", 14],
                ].map(([label, tone, value]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-ink-700">{label}</span>
                      <span className="font-medium text-ink-900">{value}%</span>
                    </div>
                    <Progress value={value as number} tone={tone as any} />
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <div className="border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900 inline-flex items-center gap-2">
                  <ListChecks className="size-4" /> Pipeline
                </p>
              </div>
              <CardBody>
                <ul className="space-y-3 text-sm">
                  {[
                    ["Sign-ups (today)", 47],
                    ["Paid checkouts", 19],
                    ["Mock interviews started", 24],
                    ["Coaching booked", 8],
                  ].map(([label, value]) => (
                    <li
                      key={label as string}
                      className="flex items-center justify-between"
                    >
                      <span className="text-ink-600">{label}</span>
                      <span className="font-semibold text-ink-900">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  delta,
}: Readonly<{
  icon: any;
  label: string;
  value: string;
  delta: string;
}>) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ink-100 text-ink-700">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-ink-500">{label}</p>
          <p className="text-2xl font-semibold text-ink-900">{value}</p>
          <p className="text-[11px] text-success-600">{delta}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function Th({ children }: Readonly<{ children?: React.ReactNode }>) {
  return (
    <th className="px-5 py-3 text-left font-medium uppercase tracking-wide">
      {children}
    </th>
  );
}
function Td({
  children,
  className,
}: Readonly<{
  children?: React.ReactNode;
  className?: string;
}>) {
  return (
    <td className={`px-5 py-4 align-middle text-ink-700 ${className ?? ""}`}>
      {children}
    </td>
  );
}

function Field({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-500">{label}</span>
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
  const startHour = Number(form.startHour);
  const endHour = Number(form.endHour);
  const intervalMin = Number(form.intervalMin);
  if (!form.name.trim() || !form.title.trim() || form.weekdays.length === 0) return null;
  if (Number.isNaN(startHour) || Number.isNaN(endHour) || startHour >= endHour) return null;
  if (![15, 30, 60].includes(intervalMin)) return null;
  const focus = form.focus
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    id: editingId ?? uid("coach"),
    name: form.name.trim(),
    title: form.title.trim(),
    focus,
    rating: Number(form.rating) || 4.8,
    sessions: Number(form.sessions) || 0,
    timezone: form.timezone.trim() || "Asia/Kolkata",
    active: form.active,
    availability: {
      weekdays: [...form.weekdays].sort((a, b) => a - b),
      startHour,
      endHour,
      intervalMin: intervalMin as 15 | 30 | 60,
    },
  };
}
