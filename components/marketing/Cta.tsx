import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section className="relative">
      <div className="container max-w-6xl py-16">
        <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.06]" />
          <div className="pointer-events-none absolute -left-24 top-0 size-96 rounded-full bg-accent-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Walk into your next interview already warmed up.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-300">
              Join thousands of candidates who used Apex to turn nerves into
              signal. Your first mock is on us.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                href="/signup"
                size="lg"
                className="bg-white text-ink-900 hover:bg-ink-100"
                rightIcon={<ArrowRight className="size-4" />}
              >
                Start your free mock
              </Button>
              <Button
                href="/#pricing"
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                See pricing
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
