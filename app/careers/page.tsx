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
              Join our coaching team
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              If anyone wants to be a part of an excellent coaching team, please feel free
              to share your profile at{" "}
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
              <li>Share your profile and coaching experience.</li>
              <li>Include your core interview domains and years of expertise.</li>
              <li>Add your preferred availability and timezone.</li>
            </ul>
            <div className="mt-6">
              <Button href="mailto:hello@selectwise.in">Send profile</Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
