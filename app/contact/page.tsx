import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        <section className="border-b border-ink-100 bg-white">
          <div className="container max-w-6xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              Contact
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              We’d love to hear from you.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              For support, partnerships, hiring, or product questions, reach out and our team will
              get back to you.
            </p>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-ink-900">Contact channels</h2>
              <div className="mt-4 space-y-3 text-sm text-ink-700">
                <p>
                  <span className="font-medium text-ink-900">Email:</span>{" "}
                  <Link href="mailto:hello@selectwise.in" className="underline">
                    hello@selectwise.in
                  </Link>
                </p>
                <p>
                  <span className="font-medium text-ink-900">Website:</span>{" "}
                  <Link href="https://www.selectwise.in" className="underline">
                    www.selectwise.in
                  </Link>
                </p>
                <p>
                  <span className="font-medium text-ink-900">Response time:</span> Usually within
                  1 business day.
                </p>
              </div>
              <div className="mt-6">
                <Button href="mailto:hello@selectwise.in">Send email</Button>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-ink-900">What can we help with?</h3>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                <li>Candidate support and account issues</li>
                <li>Interview reports and product guidance</li>
                <li>Coaching and enterprise collaboration</li>
                <li>Media and partnership inquiries</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
