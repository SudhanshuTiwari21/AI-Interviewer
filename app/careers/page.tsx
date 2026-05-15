import Link from "next/link";
import {
  ArrowRight,
  BadgeIndianRupee,
  Calendar,
  CheckCircle2,
  Mail,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/utils";

const COACH_APPLY_EMAIL = "hello@selectwise.in";

const WHY_JOIN = [
  {
    icon: BadgeIndianRupee,
    title: "Earn per session",
    body: "Flexible scheduling with competitive per-session payouts.",
  },
  {
    icon: UserCheck,
    title: "Serious candidates",
    body: "Work with interview-focused candidates who come prepared to improve.",
  },
  {
    icon: Shield,
    title: "No admin overhead",
    body: "We manage bookings, payments, and session logistics for you.",
  },
  {
    icon: TrendingUp,
    title: "Build your brand",
    body: "Grow your presence as a trusted coach in your domain.",
  },
  {
    icon: Users,
    title: "Curated network",
    body: "Join a high-quality coaching network built for meaningful outcomes.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Get onboarded",
    body: "Share your profile, expertise, and availability.",
  },
  {
    n: "02",
    title: "Receive session requests",
    body: "Get matched with candidates based on your domain.",
  },
  {
    n: "03",
    title: "Conduct sessions",
    body: "Run mock interviews and provide actionable feedback.",
  },
] as const;

const LOOKING_FOR = [
  "Strong industry experience (typically 10+ years)",
  "Experience in interviewing or mentoring candidates",
  "Expertise in one or more domains (Scrum Master, QA, Product, Development, etc.)",
  "Strong communication and feedback skills",
] as const;

const EARNINGS = [
  "Competitive per-session payouts based on your experience and domain",
  "Flexible schedule — you decide when to take sessions",
  "No minimum commitment required",
] as const;

const APPLY_STEPS = [
  "Share your professional profile and coaching or interview experience",
  "Mention your core domains (e.g. Scrum Master, QA, Product, etc.)",
  "Include years of experience and key achievements",
  "Add your availability and timezone",
] as const;

function ApplyButton({
  size = "lg",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Button
      href={`mailto:${COACH_APPLY_EMAIL}?subject=${encodeURIComponent("Coach application — SelectWise")}`}
      size={size}
      className={cn(
        "bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-soft",
        className,
      )}
      rightIcon={<ArrowRight className="size-4" />}
    >
      Apply as a Coach
    </Button>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-ink-700 sm:text-base">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CareersPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-ink-100 bg-white">
          <div className="pointer-events-none absolute -right-32 top-0 size-[420px] rounded-full bg-accent-500/15 blur-3xl" />
          <div className="container relative max-w-6xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              Coaching network
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Join Our Coaching Network
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-medium text-ink-800 sm:text-xl">
              Help candidates practice smarter, improve faster, and get selected.
            </p>
            <div className="mt-6 max-w-3xl space-y-4 text-sm leading-7 text-ink-600 sm:text-base">
              <p>
                At SelectWise, we are building a curated network of experienced professionals who
                deliver real interview insights and actionable feedback through structured mock
                interviews.
              </p>
              <p>
                If you have strong industry experience and a passion for mentoring, we would love
                to work with you.
              </p>
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-ink-600">
              <Mail className="size-4 text-accent-600" aria-hidden />
              <Link
                href={`mailto:${COACH_APPLY_EMAIL}`}
                className="font-medium text-ink-900 underline decoration-ink-300 underline-offset-2 hover:decoration-accent-500"
              >
                {COACH_APPLY_EMAIL}
              </Link>
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <ApplyButton />
              <p className="text-sm text-ink-500">We typically respond within 24–48 hours.</p>
            </div>
          </div>
        </section>

        {/* Why join */}
        <Section className="bg-white py-16 sm:py-20">
          <SectionHeading
            align="left"
            eyebrow="Why join"
            title="Why join SelectWise?"
            description="Coach on your terms while we handle the platform, candidates, and operations."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_JOIN.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-ink-200/80 bg-ink-50/30 p-6 shadow-soft"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How it works */}
        <Section className="bg-ink-50/40 py-16 sm:py-20">
          <SectionHeading
            align="left"
            eyebrow="Process"
            title="How it works"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.n}
                className="rounded-2xl border border-ink-200/80 bg-white p-6 shadow-soft"
              >
                <span className="text-xs font-semibold tracking-widest text-accent-600">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{step.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Who we are looking for */}
        <Section className="bg-white py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Ideal coach"
                title="Who we are looking for"
                description="We are looking for experienced professionals who can guide candidates with real-world insights and structured feedback."
              />
            </div>
            <div className="rounded-2xl border border-ink-200 bg-ink-50/50 p-6 sm:p-8">
              <BulletList items={LOOKING_FOR} />
            </div>
          </div>
        </Section>

        {/* Earnings */}
        <Section className="bg-ink-50/40 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Compensation"
                title="Earnings and flexibility"
              />
            </div>
            <div className="space-y-4">
              {EARNINGS.map((line) => (
                <div
                  key={line}
                  className="flex gap-3 rounded-xl border border-ink-200 bg-white p-4 shadow-soft"
                >
                  <Calendar className="mt-0.5 size-5 shrink-0 text-accent-600" aria-hidden />
                  <p className="text-sm leading-6 text-ink-700 sm:text-base">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* How to apply */}
        <Section className="bg-white py-16 sm:py-20">
          <div className="rounded-3xl border border-ink-200 bg-gradient-to-br from-accent-50/80 via-white to-white p-6 sm:p-10">
            <SectionHeading
              align="left"
              eyebrow="Get started"
              title="How to apply"
            />
            <div className="mt-8 max-w-2xl">
              <BulletList items={APPLY_STEPS} />
            </div>
            <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-ink-700">
              <Mail className="size-4 text-accent-600" aria-hidden />
              Send your profile to{" "}
              <Link
                href={`mailto:${COACH_APPLY_EMAIL}?subject=${encodeURIComponent("Coach application — SelectWise")}`}
                className="font-semibold text-ink-900 underline decoration-accent-300 underline-offset-2 hover:decoration-accent-600"
              >
                {COACH_APPLY_EMAIL}
              </Link>
            </p>
            <div className="mt-8">
              <ApplyButton />
            </div>
          </div>
        </Section>

        {/* Curated network */}
        <Section className="bg-ink-50/40 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-soft ring-1 ring-ink-200/80">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              A curated network of experts
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-600">
              We carefully onboard a limited number of experienced professionals to maintain the
              quality of coaching and ensure meaningful outcomes for candidates.
            </p>
          </div>
        </Section>

        {/* Closing CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="container max-w-6xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-ink-950 px-6 py-12 text-center sm:px-10 sm:py-14">
              <div className="pointer-events-none absolute -left-24 top-0 size-72 rounded-full bg-accent-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 bottom-0 size-72 rounded-full bg-accent-500/15 blur-3xl" />
              <div className="relative">
                <MessageSquare className="mx-auto size-10 text-accent-400" aria-hidden />
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  Make an impact beyond your job
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-300 sm:text-base">
                  Help candidates gain confidence, improve their performance, and succeed in their
                  careers — while building your own presence as a trusted coach.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    href={`mailto:${COACH_APPLY_EMAIL}?subject=${encodeURIComponent("Coach application — SelectWise")}`}
                    size="lg"
                    className="bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700"
                    rightIcon={<ArrowRight className="size-4" />}
                  >
                    Apply as a Coach
                  </Button>
                  <Button
                    href={`mailto:${COACH_APPLY_EMAIL}`}
                    size="lg"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                  >
                    Email us
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
