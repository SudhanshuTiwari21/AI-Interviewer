import Link from "next/link";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const POSTS = [
  {
    title: "How to Prepare for AI-Led Interview Rounds in 2026",
    excerpt:
      "A practical prep system for candidates who want better structure, clearer answers, and stronger performance under pressure.",
    date: "Apr 2026",
    tag: "Interview Prep",
  },
  {
    title: "What Hiring Teams Actually Look For Beyond Technical Answers",
    excerpt:
      "Communication quality, ownership signals, and decision clarity often decide outcomes more than raw memorization.",
    date: "Apr 2026",
    tag: "Hiring Insights",
  },
  {
    title: "From Mock to Offer: Building a Weekly Interview Improvement Loop",
    excerpt:
      "Use repeatable practice cycles to convert weak areas into measurable progress over 7-14 day intervals.",
    date: "Mar 2026",
    tag: "Growth Framework",
  },
];

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        <section className="border-b border-ink-100 bg-white">
          <div className="container max-w-6xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              Blog
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Interview insights, playbooks, and product updates.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              Learn how to improve interview readiness with practical frameworks from the SelectWise
              team.
            </p>
          </div>
        </section>

        <section className="container max-w-6xl px-4 py-10 sm:py-14">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post) => (
              <article key={post.title} className="rounded-2xl border border-ink-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                  {post.tag} · {post.date}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-ink-900">{post.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">{post.excerpt}</p>
                <p className="mt-4 text-sm font-medium text-ink-900">Read article →</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-ink-900">Want updates in your inbox?</h3>
            <p className="mt-2 text-sm text-ink-600">
              Reach out at{" "}
              <Link href="mailto:hello@selectwise.in" className="underline">
                hello@selectwise.in
              </Link>{" "}
              and we’ll share new articles and feature notes.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
