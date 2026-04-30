import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";

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
              Join Our Coaching Network
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              Help candidates practice smarter, improve faster, and get selected.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              At SelectWise, we are building a curated network of experienced professionals
              who can deliver real interview insights and actionable feedback.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              If you have strong industry experience and a passion for mentoring, we would
              love to work with you.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              Send your profile to{" "}
              <Link href="mailto:hello@selectwise.in" className="font-medium underline">
                hello@selectwise.in
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink-900">How to apply</h2>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              <li>Share your professional profile and coaching/interview experience.</li>
              <li>Mention your core domains (e.g., Scrum Master, QA, Product, etc.).</li>
              <li>Include years of experience and key achievements.</li>
              <li>Add your availability and timezone.</li>
            </ul>
            <div className="mt-6">
              <Button href="mailto:hello@selectwise.in">Apply as a Coach</Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
