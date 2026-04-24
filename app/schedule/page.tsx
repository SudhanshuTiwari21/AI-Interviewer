"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { store, type Booking } from "@/lib/store";
import { cn, formatDate, uid } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Globe,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const COACHES = [
  {
    id: "coach-1",
    name: "Diana Park",
    title: "Ex-Stripe, Senior Eng Manager",
    rating: 4.9,
    sessions: 312,
    focus: ["System design", "Frontend", "Career"],
  },
  {
    id: "coach-2",
    name: "Marcus Lee",
    title: "Ex-Meta, Staff Engineer",
    rating: 4.8,
    sessions: 248,
    focus: ["Backend", "System design", "Behavioral"],
  },
  {
    id: "coach-3",
    name: "Sara Okonkwo",
    title: "Ex-Notion, Group PM",
    rating: 4.95,
    sessions: 401,
    focus: ["Product sense", "Leadership", "Storytelling"],
  },
];

function buildSlots(date: Date): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (const m of [0, 30]) {
      const d = new Date(date);
      d.setHours(h, m, 0, 0);
      slots.push(d.toISOString());
    }
  }
  return slots;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
          Loading…
        </div>
      }
    >
      <ScheduleInner />
    </Suspense>
  );
}

function ScheduleInner() {
  const router = useRouter();
  const search = useSearchParams();
  const reportId = search.get("reportId");

  const [coachId, setCoachId] = useState(COACHES[0]!.id);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  useEffect(() => {
    if (!store.getUser()) router.replace("/login?next=/schedule");
  }, [router]);

  const days = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  useEffect(() => {
    if (!selectedDay) setSelectedDay(days[0] ?? null);
  }, [days, selectedDay]);

  const slots = selectedDay ? buildSlots(selectedDay) : [];
  const coach = COACHES.find((c) => c.id === coachId)!;

  function confirm() {
    if (!selectedSlot) return;
    const booking: Booking = {
      id: uid("bk"),
      coachName: coach.name,
      topic: reportId ? `Coaching on report ${reportId}` : "1-hour interview coaching",
      startsAt: selectedSlot,
      durationMin: 60,
      meetingUrl: "https://meet.google.com/apx-mock-coaching",
      calendarProvider: "google",
    };
    store.saveBooking(booking);
    setConfirmed(booking);
  }

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <Logo />
          <Button
            href="/dashboard"
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="size-4" />}
          >
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="container max-w-6xl px-4 py-10">
        <div className="mx-auto max-w-2xl text-center">
          <Badge tone="accent" dot>
            Coaching
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Book your one-hour coaching session.
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            Bookings sync to Google Calendar instantly. Reschedule any time.
          </p>
        </div>

        {confirmed ? (
          <Card className="mx-auto mt-10 max-w-xl">
            <CardBody className="text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success-50 text-success-600">
                <CheckCircle2 className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink-900">
                You're booked.
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                A Google Calendar invite is on its way to your inbox.
              </p>
              <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-left text-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={confirmed.coachName} />
                  <div>
                    <p className="font-medium text-ink-900">
                      {confirmed.coachName}
                    </p>
                    <p className="text-xs text-ink-500">{confirmed.topic}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs">
                  <Row icon={<CalendarClock className="size-3.5" />}>
                    {formatDate(confirmed.startsAt)} at{" "}
                    {new Date(confirmed.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · 60 min
                  </Row>
                  <Row icon={<Video className="size-3.5" />}>
                    {confirmed.meetingUrl}
                  </Row>
                  <Row icon={<Globe className="size-3.5" />}>
                    Google Calendar · added to {store.getUser()?.email}
                  </Row>
                </dl>
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button href="/dashboard" variant="outline">
                  Back to dashboard
                </Button>
                <Button
                  onClick={() => {
                    setConfirmed(null);
                    setSelectedSlot(null);
                  }}
                >
                  Book another
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[260px,1fr]">
            <div className="space-y-3">
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                Choose a coach
              </p>
              {COACHES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCoachId(c.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    coachId === c.id
                      ? "border-ink-900 bg-white shadow-pop"
                      : "border-ink-200 bg-white hover:border-ink-300",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {c.name}
                      </p>
                      <p className="text-xs text-ink-500">{c.title}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.focus.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink-500">
                    ★ {c.rating} · {c.sessions} sessions
                  </p>
                </button>
              ))}
            </div>

            <Card>
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {coach.name}'s availability
                </p>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Previous week"
                    onClick={() => {
                      const d = new Date(weekStart);
                      d.setDate(d.getDate() - 7);
                      setWeekStart(d);
                      setSelectedDay(null);
                      setSelectedSlot(null);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    aria-label="Next week"
                    onClick={() => {
                      const d = new Date(weekStart);
                      d.setDate(d.getDate() + 7);
                      setWeekStart(d);
                      setSelectedDay(null);
                      setSelectedSlot(null);
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <CardBody>
                <div className="grid grid-cols-5 gap-2">
                  {days.map((d) => {
                    const isSelected =
                      selectedDay?.toDateString() === d.toDateString();
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          setSelectedDay(d);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-center transition-all",
                          isSelected
                            ? "border-ink-900 bg-ink-900 text-white"
                            : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                        )}
                      >
                        <p className="text-[10px] uppercase tracking-wide opacity-70">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className="mt-1 text-base font-semibold">
                          {d.getDate()}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    {selectedDay
                      ? `Slots for ${selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
                      : "Pick a day"}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {slots.map((iso) => {
                      const t = new Date(iso);
                      const isSelected = selectedSlot === iso;
                      return (
                        <button
                          key={iso}
                          onClick={() => setSelectedSlot(iso)}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                            isSelected
                              ? "border-accent-500 bg-accent-50 text-accent-700"
                              : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                          )}
                        >
                          {t.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardBody>
              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-ink-500">
                  {selectedSlot
                    ? `${formatDate(selectedSlot)} at ${new Date(selectedSlot).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · 60 min · Google Meet`
                    : "Pick a slot to continue"}
                </p>
                <Button onClick={confirm} disabled={!selectedSlot}>
                  Confirm booking
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-ink-600">
      <span className="text-ink-400">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
