import { Section, SectionHeading } from "@/components/ui/Section";
import { Avatar } from "@/components/ui/Avatar";

const QUOTES = [
  {
    quote:
      "I ran three Selectwise sessions before my Stripe loop and walked in unfazed. Hiro's follow-ups felt like a real interviewer.",
    name: "Priya Sharma",
    role: "Senior Frontend Engineer · Stripe",
  },
  {
    quote:
      "The scored report told me exactly where I was vague. Two coaching calls later I had two offers.",
    name: "Marcus Chen",
    role: "Product Manager · Notion",
  },
  {
    quote:
      "Best ₹199 I've spent on prep. The dynamic follow-ups exposed gaps no friend could.",
    name: "Aisha Patel",
    role: "Staff Backend Engineer · Datadog",
  },
];

export function Testimonials() {
  return (
    <Section className="bg-ink-50/40">
      <SectionHeading
        eyebrow="Loved by candidates"
        title="From first mock to signed offer."
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {QUOTES.map((q) => (
          <figure
            key={q.name}
            className="flex flex-col justify-between rounded-2xl border border-ink-200/80 bg-white p-6 shadow-soft"
          >
            <blockquote className="text-sm leading-6 text-ink-700">
              "{q.quote}"
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <Avatar name={q.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-ink-900">{q.name}</p>
                <p className="text-xs text-ink-500">{q.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
