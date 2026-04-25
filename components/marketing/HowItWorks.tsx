import { Section, SectionHeading } from "@/components/ui/Section";

const STEPS = [
  {
    n: "01",
    title: "Configure your role",
    body: "Pick the role, level, and focus areas. Hiro calibrates the rubric and question pool.",
  },
  {
    n: "02",
    title: "Run a realistic interview",
    body: "Answer by voice or text. The engine adapts in real time to probe depth and structure.",
  },
  {
    n: "03",
    title: "Get a scored report",
    body: "Receive an instant PDF report with strengths, gaps, and a recommended study plan.",
  },
  {
    n: "04",
    title: "Book human coaching",
    body: "Schedule a 1-hour session with a senior coach. Calendar invites sent automatically.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" className="bg-ink-50/40">
      <SectionHeading
        eyebrow="How it works"
        title="From sign-up to offer-ready, in four steps."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="relative rounded-2xl border border-ink-200/80 bg-white p-6 shadow-soft"
          >
            <span className="text-xs font-semibold tracking-widest text-accent-600">
              {s.n}
            </span>
            <h3 className="mt-3 text-base font-semibold text-ink-900">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-500">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
