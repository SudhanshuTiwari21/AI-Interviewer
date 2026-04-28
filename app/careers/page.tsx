import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";

const OPEN_ROLES = [
  {
    title: "Founding Full-Stack Engineer",
    mode: "Remote · India",
    type: "Full-time",
    summary:
      "Own end-to-end product surfaces across AI interview, reporting, and admin operations.",
  },
  {
    title: "AI Product Engineer",
    mode: "Remote · India",
    type: "Full-time",
    summary:
      "Build high-quality interview intelligence flows, scoring systems, and learning feedback loops.",
  },
  {
    title: "Customer Success & Coaching Operations",
    mode: "Hybrid · Bengaluru",
    type: "Full-time",
    summary:
      "Drive candidate success, coaching quality, and operational excellence across support workflows.",
  },
];

export default function CareersPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        <section className="border-b border-ink-100 bg-white">
          <div className="container max-w-6xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              Careers
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Build the future of interview readiness.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              SelectWise is building an AI-first platform that helps candidates practice with
              confidence, improve faster, and perform better in real interviews. We are looking for
              builders who care deeply about product quality and user outcomes.
            </p>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 sm:py-14">
          <div className="grid gap-4">
            {OPEN_ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-2xl border border-ink-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-ink-900">{role.title}</h2>
                    <p className="mt-1 text-sm text-ink-500">
                      {role.mode} · {role.type}
                    </p>
                  </div>
                  <Button href="/contact" size="sm">
                    Apply now
                  </Button>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-700">{role.summary}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-ink-900">Don’t see your role?</h3>
            <p className="mt-2 text-sm text-ink-600">
              We are always open to speaking with strong builders across engineering, product,
              design, operations, and growth.
            </p>
            <p className="mt-3 text-sm text-ink-700">
              Share your profile at{" "}
              <Link href="mailto:hello@selectwise.in" className="underline">
                hello@selectwise.in
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
