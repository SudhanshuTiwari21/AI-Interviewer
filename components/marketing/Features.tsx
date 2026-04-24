import { Section, SectionHeading } from "@/components/ui/Section";
import {
  Mic,
  Sparkles,
  FileText,
  CalendarClock,
  ShieldCheck,
  LineChart,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Adaptive question engine",
    body: "Blends a curated rubric with adaptive follow-ups so every prompt builds on your last answer.",
  },
  {
    icon: Mic,
    title: "Voice-first answering",
    body: "Speak naturally - high-accuracy transcription is rendered live so you can review as you go.",
  },
  {
    icon: FileText,
    title: "Instant scored reports",
    body: "Get a structured PDF and HTML report with strengths, gaps, and concrete next steps.",
  },
  {
    icon: CalendarClock,
    title: "Book a human coach",
    body: "Pair interview practice with a 1-hour coaching call. Bookings sync to Google Calendar instantly.",
  },
  {
    icon: LineChart,
    title: "Role-specific signal",
    body: "Rubrics calibrated by senior interviewers from FAANG, marketplaces, and high-growth startups.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Audio is processed in-session and never shared. Reports are encrypted at rest.",
  },
];

export function Features() {
  return (
    <Section id="features" className="bg-white">
      <SectionHeading
        eyebrow="Why Apex"
        title="Everything you need to walk in calm and prepared."
        description="An end-to-end loop: configure the role, run a realistic interview, receive a scored report, and book human coaching - all in one place."
      />
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-100 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group flex flex-col gap-3 bg-white p-6 transition-colors hover:bg-ink-50/50"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-ink-900 text-white transition-transform group-hover:scale-105">
              <f.icon className="size-4" />
            </span>
            <h3 className="text-base font-semibold text-ink-900">{f.title}</h3>
            <p className="text-sm leading-6 text-ink-500">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
