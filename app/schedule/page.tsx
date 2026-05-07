"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { store } from "@/lib/store";
import { buildSlotsForCoach, type Coach } from "@/lib/coaches";
import { ensureRazorpayScriptLoaded } from "@/lib/payments/client";
import { TARGET_ROLES } from "@/lib/target-roles";
import { cn, formatDate, uid } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  AlertTriangle,
} from "lucide-react";

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(d: Date) {
  const date = new Date(d);
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

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachId, setCoachId] = useState<string>("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedTechArea, setSelectedTechArea] = useState<string>("");
  const [techSearch, setTechSearch] = useState("");
  const [techAreas, setTechAreas] = useState<string[]>([...TARGET_ROLES]);
  const [coachPickerOpen, setCoachPickerOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    id: string;
    coachName: string;
    techArea: string;
    startsAt: string;
    amountInr: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store.getUser()) {
      router.replace("/login?next=/schedule");
      return;
    }
    void fetch("/api/coaches", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const all = (d.ok ? d.coaches : []).filter((c: Coach) => c.active);
        setCoaches(all);
      })
      .catch(() => {
        setCoaches([]);
      });
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const roles = d?.settings?.targetRoles;
        if (Array.isArray(roles) && roles.length > 0) {
          setTechAreas(roles);
        }
      })
      .catch(() => {
        setTechAreas([...TARGET_ROLES]);
      });
  }, [coachId, router]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d < today) return null;
      return d;
    }).filter((d): d is Date => d !== null);
  }, [weekStart]);

  useEffect(() => {
    if (!selectedDay || (days.length > 0 && !days.some((d) => d.toDateString() === selectedDay.toDateString()))) {
      setSelectedDay(days[0] ?? null);
    }
  }, [days, selectedDay]);

  useEffect(() => {
    if (!selectedTechArea && techAreas[0]) {
      setSelectedTechArea(techAreas[0]);
    }
  }, [selectedTechArea, techAreas]);

  const filteredCoaches = useMemo(() => {
    if (!selectedTechArea) return coaches;
    const selected = selectedTechArea.toLowerCase();
    return coaches.filter((c) =>
      c.techAreas.some((area) => area.toLowerCase().includes(selected) || selected.includes(area.toLowerCase())),
    );
  }, [coaches, selectedTechArea]);

  useEffect(() => {
    if (!filteredCoaches.some((c) => c.id === coachId)) setCoachId("");
  }, [coachId, filteredCoaches]);

  const visibleTechAreas = useMemo(() => {
    const q = techSearch.trim().toLowerCase();
    if (!q) return techAreas;
    return techAreas.filter((area) => area.toLowerCase().includes(q));
  }, [techAreas, techSearch]);

  const coach = filteredCoaches.find((c) => c.id === coachId) ?? null;
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function loadBooked() {
      if (!coach?.id) return;
      const res = await fetch("/api/coaching/bookings", { cache: "no-store" });
      const data = await res.json();
      if (!cancelled && data.ok) {
        const taken = (data.bookings as Array<{ coachId: string; startsAt: string; status: string }>)
          .filter((b) => b.coachId === coach.id && b.status !== "cancelled" && b.status !== "rejected")
          .map((b) => new Date(b.startsAt).toISOString());
        setBookedSlots(taken);
      }
    }
    void loadBooked();
    return () => {
      cancelled = true;
    };
  }, [coach?.id]);
  const bookedSet = useMemo(() => new Set(bookedSlots), [bookedSlots]);
  const slots =
    selectedDay && coach
      ? buildSlotsForCoach(coach, selectedDay).filter((s) => {
          if (bookedSet.has(s)) return false;
          return new Date(s).getTime() > Date.now();
        })
      : [];

  async function confirm() {
    if (!selectedSlot || !coach || !selectedTechArea) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const user = store.getUser();
      if (!user) {
        router.replace("/login?next=/schedule");
        return;
      }
      const scriptReady = await ensureRazorpayScriptLoaded();
      if (!scriptReady || !globalThis.window?.Razorpay) {
        setError("Could not load payment gateway. Please refresh and try again.");
        return;
      }
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productType: "coaching",
          amountInr: coach.perSessionRateInr,
          metadata: {
            coachId: coach.id,
            techArea: selectedTechArea,
            startsAt: selectedSlot,
          },
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        setError(orderData.message ?? "Could not start payment.");
        return;
      }
      const paymentResult = await new Promise<{
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      } | null>((resolve) => {
        const rz = new globalThis.window.Razorpay({
          key: orderData.razorpayKeyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "SelectWise",
          description: `${selectedTechArea} coaching session`,
          order_id: orderData.order.id,
          prefill: {
            name: user.name,
            email: user.email,
          },
          notes: { productType: "coaching" },
          theme: { color: "#111827" },
          handler: (response) => resolve(response),
          modal: { ondismiss: () => resolve(null) },
        });
        rz.open();
      });
      if (!paymentResult) {
        setError("Payment was cancelled.");
        return;
      }
      const verifyRes = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: paymentResult.razorpay_order_id,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature,
          transactionId: orderData.transactionId,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.ok) {
        setError(verifyData.message ?? "Payment verification failed.");
        return;
      }
      const res = await fetch("/api/coaching/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          techArea: selectedTechArea,
          coachId: coach.id,
          coachName: coach.name,
          coachEmail: coach.email,
          coachTimezone:
            coach.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "UTC",
          startsAt: selectedSlot,
          amountInr: coach.perSessionRateInr,
          paymentTransactionId: verifyData.transaction.id,
          razorpayOrderId: paymentResult.razorpay_order_id,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? "Could not create coaching booking.");
        return;
      }
      setConfirmed({
        id: data.booking.id ?? uid("cb"),
        coachName: coach.name,
        techArea: selectedTechArea,
        startsAt: selectedSlot,
        amountInr: coach.perSessionRateInr,
      });
      setSelectedSlot(null);
    } catch {
      setError("Network error while creating booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (coaches.length === 0) {
    return (
      <div className="min-h-screen bg-ink-50/40">
        <header className="border-b border-ink-100 bg-white">
          <div className="container flex h-16 max-w-6xl items-center justify-between">
            <Logo />
            <Button href="/dashboard" variant="ghost" size="sm" leftIcon={<ArrowLeft className="size-4" />}>
              Back to dashboard
            </Button>
          </div>
        </header>
        <main className="container max-w-3xl px-4 py-16">
          <Card>
            <CardBody className="text-center">
              <h1 className="text-xl font-semibold text-ink-900">No coaches available</h1>
              <p className="mt-2 text-sm text-ink-500">
                Admin has not added any active coaches yet. Please check back later.
              </p>
            </CardBody>
          </Card>
        </main>
      </div>
    );
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
            Book your 30-minute coaching session.
          </h1>
          <p className="mt-3 text-sm text-ink-500">
            Choose your tech area, pay coaching fees, and request a coach slot.
          </p>
        </div>

        {confirmed ? (
          <Card className="mx-auto mt-10 max-w-xl">
            <CardBody className="text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-success-50 text-success-600">
                <CheckCircle2 className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink-900">Request sent.</h2>
              <p className="mt-1 text-sm text-ink-500">
                Coach and admin have been notified. Once the coach approves, you and admin will get a confirmation email.
              </p>
              <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-left text-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={confirmed.coachName} />
                  <div>
                    <p className="font-medium text-ink-900">
                      {confirmed.coachName}
                    </p>
                    <p className="text-xs text-ink-500">{confirmed.techArea} coaching</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs">
                  <Row icon={<CalendarClock className="size-3.5" />}>
                    {formatDate(confirmed.startsAt)} at{" "}
                    {new Date(confirmed.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · 30 min
                  </Row>
                  <Row icon={<IndianRupee className="size-3.5" />}>
                    ₹{confirmed.amountInr} paid
                  </Row>
                  <Row icon={<Globe className="size-3.5" />}>
                    Booking ID · {confirmed.id}
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
                Tech area
              </p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  value={techSearch}
                  onChange={(e) => setTechSearch(e.target.value)}
                  placeholder="Search role..."
                  className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-800"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5">
                {visibleTechAreas.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-ink-500">No matching roles found.</p>
                ) : (
                  visibleTechAreas.map((area) => {
                    const active = area === selectedTechArea;
                    return (
                      <button
                        key={area}
                        onClick={() => {
                          setSelectedTechArea(area);
                          setCoachId("");
                          setSelectedSlot(null);
                          setCoachPickerOpen(true);
                        }}
                        className={cn(
                          "mb-1 block w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors last:mb-0",
                          active
                            ? "bg-ink-900 text-white"
                            : "text-ink-700 hover:bg-ink-50",
                        )}
                      >
                        {area}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                Choose a coach
              </p>
              {!selectedTechArea ? (
                <div className="rounded-2xl border border-ink-200 bg-white p-4 text-sm text-ink-600">
                  Select a role first to view available coaches.
                </div>
              ) : !coach ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCoachPickerOpen(true)}
                >
                  {filteredCoaches.length === 0 ? "No coaches available for this role" : "Select coach"}
                </Button>
              ) : (
                <div className="rounded-2xl border border-ink-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={coach.name} />
                    <div>
                      <p className="text-sm font-medium text-ink-900">{coach.name}</p>
                      <p className="text-xs text-ink-500">{coach.title}</p>
                    </div>
                  </div>
                  {coach.description ? (
                    <p className="mt-2 line-clamp-3 text-xs text-ink-600">{coach.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-ink-500">
                    ★ {coach.rating.toFixed(2)} ({coach.reviewCount ?? 0} reviews) · ₹
                    {coach.perSessionRateInr} per session
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setCoachPickerOpen(true)}
                  >
                    Change coach
                  </Button>
                </div>
              )}
            </div>

            <Card>
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {coach ? `${coach.name}'s availability` : "Select a coach to see availability"}
                </p>
                {coach && (
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Previous week"
                      onClick={() => {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() - 7);
                        const currentWeekStart = startOfWeek(new Date());
                        if (d < currentWeekStart) return;
                        setWeekStart(d);
                        setSelectedDay(null);
                        setSelectedSlot(null);
                      }}
                      disabled={weekStart <= startOfWeek(new Date())}
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
                )}
              </div>
              <CardBody>
                {coach ? (
                  <>
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
                  </>
                ) : (
                  <div className="rounded-xl border border-ink-100 bg-ink-50 px-4 py-8 text-center text-sm text-ink-600">
                    Pick a coach from the left to view calendar and time slots.
                  </div>
                )}
              </CardBody>
              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-ink-100 bg-ink-50/50 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-ink-500">
                  {selectedSlot
                    ? `${formatDate(selectedSlot)} at ${new Date(selectedSlot).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · 30 min · ₹${coach?.perSessionRateInr ?? 0} per session`
                    : "Pick a slot to continue"}
                </p>
                <div className="flex flex-col items-stretch gap-2">
                  {error && (
                    <p className="text-xs text-danger-600">
                      <AlertTriangle className="mr-1 inline size-3.5" />
                      {error}
                    </p>
                  )}
                  <Button onClick={confirm} disabled={!selectedSlot || isSubmitting || !coach}>
                    {isSubmitting ? "Processing payment..." : "Pay & request booking"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {coachPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">
                {selectedTechArea
                  ? `Available coaches for ${selectedTechArea}`
                  : "Select a role first"}
              </p>
              <button
                className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                onClick={() => setCoachPickerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {filteredCoaches.length === 0 ? (
                <div className="rounded-xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-600">
                  No coach is available currently for <span className="font-medium">{selectedTechArea}</span>.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredCoaches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCoachId(c.id);
                        setSelectedSlot(null);
                        setCoachPickerOpen(false);
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        coachId === c.id
                          ? "border-ink-900 bg-ink-50"
                          : "border-ink-200 bg-white hover:border-ink-300",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} />
                        <div>
                          <p className="text-sm font-medium text-ink-900">{c.name}</p>
                          <p className="text-xs text-ink-500">{c.title}</p>
                        </div>
                      </div>
                      {c.description ? (
                        <p className="mt-2 line-clamp-3 text-xs text-ink-600">{c.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-ink-500">
                        ★ {c.rating.toFixed(2)} ({c.reviewCount ?? 0} reviews) · {c.sessions} sessions · ₹
                        {c.perSessionRateInr} per session
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  children,
}: Readonly<{
  icon: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex items-center gap-2 text-ink-600">
      <span className="text-ink-400">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
