import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        <section className="border-b border-ink-100 bg-white">
          <div className="container max-w-5xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              About SelectWise
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              We help candidates prepare for success.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              Interview readiness for freshers, professionals, and leadership candidates - powered
              by intelligent practice, structured feedback, and expert coaching.
            </p>
          </div>
        </section>

        <section className="container max-w-5xl px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-10">
            <div className="space-y-5 text-sm leading-7 text-ink-700 sm:text-base">
              <p>
                At SelectWise, we believe your next interview should never be your first real practice.
              </p>
              <p>
                Interviews are not just about knowledge - they are about confidence, clarity,
                communication, and preparation. Many talented candidates miss great opportunities not
                because they lack skills, but because they are not prepared to present themselves
                effectively during interviews.
              </p>
              <p>That is where SelectWise makes the difference.</p>
              <p>
                SelectWise is an AI-powered interview readiness platform designed to help freshers,
                working professionals, and leadership candidates prepare for real-world interviews
                with confidence. Whether you are preparing for your first campus placement, switching
                careers, aiming for a promotion, or targeting senior leadership roles, our platform
                helps you practice smarter and perform better.
              </p>
              <p>
                Through our intelligent interview engine, candidates can experience role-specific
                mock interviews using voice or text responses, receive instant feedback reports,
                identify strengths and improvement areas, and take focused coaching sessions to
                strengthen their interview performance.
              </p>
              <p>Meet Hiro - your AI Interview Coach.</p>
              <p>
                Hiro guides candidates through personalized mock interviews, adaptive follow-up
                questions, scoring, and improvement recommendations designed to simulate real
                interview pressure while helping users improve continuously.
              </p>
              <p>Our goal is simple:</p>
              <p className="font-semibold text-ink-900">Practice. Improve. Get Selected.</p>
              <p>
                We are building more than a mock interview tool - we are building a career
                acceleration platform where preparation meets opportunity.
              </p>
              <p>
                From interview practice to expert coaching, and soon resume optimization and career
                readiness services, SelectWise is designed to support candidates at every stage of
                their professional journey.
              </p>
              <p>At SelectWise, we do not just help people prepare for interviews.</p>
              <p className="font-semibold text-ink-900">We help them prepare for success.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
