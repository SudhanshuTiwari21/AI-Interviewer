"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";
import { store } from "@/lib/store";
import { ensureRazorpayScriptLoaded } from "@/lib/payments/client";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ShieldCheck,
  Check,
  ArrowLeft,
  AlertTriangle,
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
  const [interviewPrice, setInterviewPrice] = useState(INTERVIEW_PRICE_INR);
  const [supportEmail, setSupportEmail] = useState("hi@selectwise.app");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const u = store.getUser();
    if (!u) {
      router.replace("/login?next=/checkout");
      return;
    }
    setCheckedAuth(true);

    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        if (typeof d.settings?.pricePerInterviewInr === "number") {
          setInterviewPrice(d.settings.pricePerInterviewInr);
        }
        if (typeof d.settings?.supportEmail === "string") {
          setSupportEmail(d.settings.supportEmail);
        }
        if (d.settings?.maintenanceMode) {
          setMaintenanceMode(true);
        }
      });
  }, [router]);

  if (!checkedAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-500">
        Redirecting to login…
      </div>
    );
  }

  if (maintenanceMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50/40 px-4 text-center">
        <div className="max-w-md rounded-2xl border border-ink-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-ink-900">Checkout is temporarily unavailable</h1>
          <p className="mt-2 text-sm text-ink-500">
            We are in maintenance mode. Please try again shortly.
          </p>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const user = store.getUser();
    if (!user) {
      setLoading(false);
      router.replace("/login?next=/checkout");
      return;
    }
    try {
      const scriptReady = await ensureRazorpayScriptLoaded();
      if (!scriptReady || !globalThis.window?.Razorpay) {
        setError("Could not load payment gateway. Please refresh and try again.");
        return;
      }
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productType: "interview",
          amountInr: interviewPrice,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.ok) {
        setError(orderData.message ?? "Unable to start payment.");
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
          description: "Interview access payment",
          order_id: orderData.order.id,
          prefill: {
            name: user.name,
            email: user.email,
          },
          notes: { productType: "interview" },
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
      setDone(true);
      setTimeout(() => router.push("/interview/setup"), 900);
    } catch {
      setError("Something went wrong while processing payment.");
    } finally {
      setLoading(false);
    }
  }

  const total = interviewPrice;

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <Logo />
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
          >
            <ArrowLeft className="size-4" /> Back to pricing
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
              Secure payment powered by Razorpay.
            </p>

            <div className="mt-7 rounded-xl border border-ink-200 bg-ink-50/50 p-4 text-sm text-ink-600">
              You will be redirected to Razorpay's secure checkout to complete your
              payment. Once successful, your interview will unlock immediately.
            </div>

            <div className="mt-7 flex items-center gap-2 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-600">
              <ShieldCheck className="size-4 text-success-500" />
              <span>Payments are verified securely on our server.</span>
            </div>
            {error && (
              <p className="mt-4 text-sm text-danger-600">
                <AlertTriangle className="mr-1 inline size-4" />
                {error}
              </p>
            )}

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
                <>Pay {formatCurrency(total, "INR")}</>
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
                    Selectwise interview
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Billed per interview
                  </p>
                </div>
                <p className="text-sm font-medium text-ink-900">
                  {formatCurrency(interviewPrice, "INR")}
                </p>
              </div>
              <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5 text-xs text-ink-700">
                {[
                  "Resume-driven interview flow",
                  "Dynamic follow-up questions",
                  "Premium interviewer controls included",
                  "Detailed report with weak-area reasons",
                  "Coaching session booking support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 flex-none text-accent-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-1.5 border-t border-ink-100 pt-5 text-sm">
                <Row label="Subtotal" value={formatCurrency(interviewPrice, "INR")} />
                <Row
                  label="Total due today"
                  value={formatCurrency(total, "INR")}
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
                <a className="text-ink-900 underline" href={`mailto:${supportEmail}`}>
                  {supportEmail}
                </a>{" "}
                - we typically respond within an hour during business hours.
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
}: Readonly<{
  label: string;
  value: string;
  bold?: boolean;
}>) {
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
