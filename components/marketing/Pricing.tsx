"use client";

import { useEffect, useState } from "react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Check } from "lucide-react";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";
import { formatCurrency } from "@/lib/utils";

export function Pricing() {
  const [price, setPrice] = useState(INTERVIEW_PRICE_INR);

  useEffect(() => {
    void fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && typeof d.settings?.pricePerInterviewInr === "number") {
          setPrice(d.settings.pricePerInterviewInr);
        }
      });
  }, []);

  return (
    <Section id="pricing" className="bg-white">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple pricing, no plans."
        description="Every Selectwise interview costs a flat fee, and Hiro's full interviewer capabilities are unlocked for everyone."
      />
      <div className="mx-auto mt-14 max-w-2xl rounded-2xl border border-ink-900 bg-white p-7 shadow-pop">
        <span className="inline-flex items-center rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-white">
          Flat pricing
        </span>
        <h3 className="mt-4 text-lg font-semibold text-ink-900">Per interview</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight text-ink-900">
            {formatCurrency(price, "INR")}
          </span>
          <span className="text-sm text-ink-500">/interview</span>
        </div>
        <ul className="mt-6 space-y-3">
          {[
            "Dynamic role-specific interview flow",
            "CV-driven counter questions",
            "All premium controls (style, company target, stress mode)",
            "Voice + text answers with instant report",
            "Detailed weak-area analysis and coaching recommendations",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
              <Check className="mt-0.5 size-4 flex-none text-accent-600" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
