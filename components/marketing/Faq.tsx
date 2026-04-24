"use client";

import { useState } from "react";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    q: "Do I need to install anything?",
    a: "No — Apex runs entirely in your browser. We use the Web Speech API for live transcription and the MediaRecorder API for voice capture, with a Whisper fallback on the server.",
  },
  {
    q: "Which roles do you support?",
    a: "Frontend, Backend, Full-Stack, Product Manager, Data Scientist, and Designer roles across Junior to Staff levels. Custom rubrics are available on the Team plan.",
  },
  {
    q: "Is the AI replacing the human coach?",
    a: "Not at all. The AI loop is great for unlimited reps; the coach is there for nuanced feedback, story crafting, and offer negotiation.",
  },
  {
    q: "How is my data handled?",
    a: "Audio is processed in-session and discarded by default. Transcripts and reports are encrypted at rest and only visible to you (and admins you grant access to).",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from the dashboard with one click. No questions, no retention emails.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" className="bg-white">
      <SectionHeading eyebrow="FAQ" title="Questions, answered." />
      <div className="mx-auto mt-12 max-w-2xl divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
        {ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-ink-900">
                  {item.q}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 flex-none text-ink-500 transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm leading-6 text-ink-500 animate-fade-in">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
