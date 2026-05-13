import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function TermsAndConditionsPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-ink-50/40">
        <section className="border-b border-ink-100 bg-white">
          <div className="container max-w-5xl px-4 py-14 sm:py-20">
            <p className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-600">
              Legal
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Terms and Conditions
            </h1>
            <p className="mt-3 text-sm text-ink-600 sm:text-base">
              Effective Date: 01/05/2026
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              Welcome to SelectWise.in. These Terms and Conditions govern your use of our platform
              and services. By using SelectWise.in, you agree to these Terms.
            </p>
          </div>
        </section>

        <section className="container max-w-5xl px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-10">
            <div className="space-y-7 text-sm leading-7 text-ink-700 sm:text-base">
              <LegalBlock
                title="1. Services"
                body={[
                  "SelectWise provides AI-powered mock interview simulations, personalised interview reports and scoring, CV review and interview preparation support, paid one-to-one coaching sessions, and career readiness guidance.",
                  "Our services are designed to support interview preparation and professional development.",
                  "We do not guarantee job placement, interview selection, or employment outcomes.",
                ]}
              />

              <LegalBlock
                title="2. User Responsibilities"
                body={[
                  "You agree to provide accurate and truthful information, use the platform for lawful purposes only, not misuse/copy/disrupt/abuse the system, not impersonate others or submit false documents, and respect coaching schedules and professional conduct.",
                  "Any misuse may result in suspension or termination of access.",
                ]}
              />

              <LegalBlock
                title="3. Payments and Refunds"
                body={[
                  "All payments for interviews, reports, and coaching sessions are subject to pricing displayed at the time of purchase.",
                  "Mock interview payments are generally non-refundable once the interview has started.",
                  "Coaching session payments may be rescheduled with reasonable notice, subject to availability.",
                  "Refund requests may be reviewed case-by-case for genuine technical failures or exceptional circumstances.",
                  "Final refund decisions remain with SelectWise management.",
                ]}
              />

              <LegalBlock
                title="4. Coaching Sessions"
                body={[
                  "Coaching sessions are professional guidance sessions intended to improve interview readiness.",
                  "Users are expected to attend on time, communicate respectfully, and use booked sessions responsibly.",
                  "Missed sessions without prior notice may not qualify for rescheduling.",
                ]}
              />

              <LegalBlock
                title="5. AI-Generated Content Disclaimer"
                body={[
                  "Interview questions, reports, and recommendations may be generated or assisted by AI systems.",
                  "While we aim for high-quality outputs, AI-generated content may not always be perfect and should be used as guidance, not as legal, employment, or professional certainty.",
                ]}
              />

              <LegalBlock
                title="6. Intellectual Property"
                body={[
                  "All platform content, workflows, reports, branding, and materials belong to SelectWise unless otherwise stated.",
                  "Users may not reproduce, resell, copy, or commercially exploit our content without written permission.",
                ]}
              />

              <LegalBlock
                title="7. Limitation of Liability"
                body={[
                  "SelectWise is not liable for job rejection or employment decisions, third-party service failures, technical interruptions beyond reasonable control, or indirect losses arising from platform use.",
                  "Our maximum liability is limited to the amount paid by the user for the specific service in question.",
                ]}
              />

              <LegalBlock
                title="8. Account Suspension"
                body={[
                  "We reserve the right to suspend or terminate access for fraudulent behavior, abuse of the platform, violation of these Terms, security risks, or misuse.",
                ]}
              />

              <LegalBlock
                title="9. Changes to Terms"
                body={[
                  "We may revise these Terms from time to time. Continued use of the platform indicates acceptance of updated Terms.",
                ]}
              />

              <LegalBlock
                title="10. Governing Law"
                body={[
                  "These Terms are governed by and interpreted under the laws of India.",
                  "Any disputes are subject to jurisdiction of the appropriate courts in India.",
                ]}
              />

              <LegalBlock
                title="11. Contact"
                body={["For support regarding Terms: Email: hello@selectwise.in | Website: www.selectwise.in"]}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function LegalBlock({
  title,
  body,
}: Readonly<{
  title: string;
  body: string[];
}>) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-2 space-y-2">
        {body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}
