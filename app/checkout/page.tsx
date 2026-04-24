"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PLANS, type Plan } from "@/lib/mock-data";
import { store } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  Lock,
  ShieldCheck,
  Calendar,
  Check,
  ArrowLeft,
} from "lucide-react";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
          Loading checkout…
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const planId = (search.get("plan") as Plan["id"]) || "pro";
  const plan = useMemo(() => PLANS.find((p) => p.id === planId) ?? PLANS[1]!, [planId]);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12 / 28");
  const [cvc, setCvc] = useState("123");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const u = store.getUser();
    if (u && !cardName) setCardName(u.name);
  }, [cardName]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const u = store.getUser();
      if (u) store.setUser({ ...u, plan: plan.id });
      setLoading(false);
      setDone(true);
      setTimeout(() => router.push("/interview/setup"), 1200);
    }, 1100);
  }

  const tax = Math.round(plan.price * 0.08);
  const total = plan.price + tax;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <Logo />
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" /> Change plan
          </Link>
        </div>
      </header>
      <main className="container max-w-6xl py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.95fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8"
          >
            <h1 className="text-xl font-semibold text-ink-900">Checkout</h1>
            <p className="mt-1 text-sm text-ink-500">
              Secure payment processed by Apex (Stripe-compatible test mode).
            </p>

            <div className="mt-7 space-y-5">
              <Input
                label="Name on card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Alex Morgan"
              />
              <Input
                label="Card number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                leftIcon={<CreditCard className="size-4" />}
                rightSlot={
                  <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                    <Lock className="size-3" /> Encrypted
                  </span>
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Expiry"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                  leftIcon={<Calendar className="size-4" />}
                />
                <Input
                  label="CVC"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  leftIcon={<Lock className="size-4" />}
                />
              </div>
              <Input
                label="Billing email"
                type="email"
                placeholder="alex@company.com"
                defaultValue={store.getUser()?.email}
              />
            </div>

            <div className="mt-7 flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-600">
              <ShieldCheck className="size-4 text-success-500" />
              <span>
                This is a demo flow. No real charge will be made — use any test
                card.
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-7 w-full"
              loading={loading}
              disabled={done}
            >
              {done ? (
                <>
                  <Check className="size-4" /> Payment successful
                </>
              ) : (
                <>Pay {formatCurrency(total)}</>
              )}
            </Button>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-ink-200 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Order summary
              </p>
              <div className="mt-4 flex items-start justify-between">
                <div>
                  <p className="text-base font-semibold text-ink-900">
                    Apex {plan.name}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Billed{" "}
                    {plan.cadence === "monthly" ? "monthly" : "one-time"}
                  </p>
                </div>
                <p className="text-sm font-medium text-ink-900">
                  {formatCurrency(plan.price)}
                </p>
              </div>
              <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5 text-xs text-ink-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 flex-none text-accent-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-1.5 border-t border-ink-100 pt-5 text-sm">
                <Row label="Subtotal" value={formatCurrency(plan.price)} />
                <Row label="Tax (est.)" value={formatCurrency(tax)} />
                <Row
                  label="Total due today"
                  value={formatCurrency(total)}
                  bold
                />
              </dl>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-white p-6 text-xs leading-5 text-ink-500">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Need help?
              </p>
              <p className="mt-2">
                Email{" "}
                <a className="text-ink-900 underline" href="mailto:hi@apex.app">
                  hi@apex.app
                </a>{" "}
                — we typically respond within an hour during business hours.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        bold ? "pt-1.5 text-base font-semibold text-ink-900" : "text-ink-600",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
