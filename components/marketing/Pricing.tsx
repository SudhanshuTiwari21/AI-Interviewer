import { Section, SectionHeading } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/mock-data";
import { Check } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function Pricing() {
  return (
    <Section id="pricing" className="bg-white">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple plans, zero surprises."
        description="Pay once for a single mock or subscribe for unlimited rehearsals — keep what works for you."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-7",
              plan.highlight
                ? "border-ink-900 shadow-pop"
                : "border-ink-200 shadow-soft",
            )}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white">
                Most popular
              </span>
            )}
            <h3 className="text-sm font-semibold text-ink-900">{plan.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight text-ink-900">
                {formatCurrency(plan.price)}
              </span>
              <span className="text-sm text-ink-500">
                /{plan.cadence === "monthly" ? "mo" : "once"}
              </span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-ink-700"
                >
                  <Check className="mt-0.5 size-4 flex-none text-accent-600" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-7 pt-2">
              <Button
                href={`/checkout?plan=${plan.id}`}
                variant={plan.highlight ? "primary" : "outline"}
                className="w-full"
              >
                {plan.id === "team" ? "Start team trial" : "Choose " + plan.name}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
