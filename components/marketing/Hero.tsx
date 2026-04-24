import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, ShieldCheck, Mic } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" />
      <div className="pointer-events-none absolute -left-40 top-0 size-[520px] rounded-full bg-accent-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-24 size-[380px] rounded-full bg-ink-900/5 blur-3xl" />

      <div className="container relative max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-medium text-ink-700 shadow-soft">
            <Sparkles className="size-3.5 text-accent-500" />
            Now with adaptive follow-ups that react in real time
          </span>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
            Practice the interview.
            <br />
            <span className="gradient-text">Land the offer.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-ink-500 sm:text-lg">
            Apex runs a fully autonomous, voice-enabled mock interview tailored
            to your target role - then delivers a scored report and pairs you
            with a human coach.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/signup" size="lg" rightIcon={<ArrowRight className="size-4" />}>
              Start a mock interview
            </Button>
            <Button href="/#how" variant="outline" size="lg">
              See how it works
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-success-500" /> SOC 2-ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mic className="size-3.5 text-accent-500" /> Real-time speech-to-text
            </span>
            <span>No credit card required</span>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative rounded-2xl border border-ink-200/80 bg-white shadow-card">
      <div className="flex items-center gap-1.5 border-b border-ink-100 px-4 py-3">
        <span className="size-2.5 rounded-full bg-ink-200" />
        <span className="size-2.5 rounded-full bg-ink-200" />
        <span className="size-2.5 rounded-full bg-ink-200" />
        <span className="ml-3 text-xs text-ink-400">apex.app/interview</span>
      </div>
      <div className="grid gap-0 lg:grid-cols-[1.4fr,1fr]">
        <div className="border-b border-ink-100 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">
              <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
              Question 4 of 6 · Adaptive
            </span>
            <span className="text-xs text-ink-400">02:14</span>
          </div>
          <p className="mt-4 text-lg font-medium leading-7 text-ink-900">
            You mentioned reducing latency by 40% - can you walk me through the
            trade-offs you considered there, especially around cache invalidation?
          </p>
          <div className="mt-6 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 animate-pulse rounded-full bg-danger-500" />
                Recording · live transcript
              </span>
              <span>Voice</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-700">
              Sure - the biggest trade-off was between consistency and freshness.
              We chose a write-through cache for hot keys and accepted a 2-second
              staleness window for the long tail, which let us
              <span className="text-ink-400"> cut p95 latency from 380ms to 220ms…</span>
            </p>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-10 items-end gap-1 text-accent-500">
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </div>
            <button className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-ink-900 px-3 text-xs font-medium text-white">
              Submit answer
            </button>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Live signals
            </p>
            <div className="mt-3 space-y-3">
              {[
                ["Structure", 84],
                ["Technical depth", 78],
                ["Communication", 91],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-600">{label}</span>
                    <span className="font-medium text-ink-900">{value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-700"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-ink-100 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Coming next
            </p>
            <p className="mt-2 text-sm font-medium text-ink-900">
              System design deep-dive
            </p>
            <p className="mt-1 text-xs text-ink-500">
              AI will probe based on your last answer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
