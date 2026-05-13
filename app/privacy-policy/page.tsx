import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-ink-600 sm:text-base">
              Effective Date: 01/05/2026
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              This Privacy Policy explains data collection, usage, storage, and protection practices
              for personal information when using the platform, including AI-powered mock interviews,
              interview reports, CV reviews, and coaching services. Continued use of the
              platform indicates acceptance of the practices described in this Privacy Policy.
            </p>
          </div>
        </section>

        <section className="container max-w-5xl px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-10">
            <div className="space-y-7 text-sm leading-7 text-ink-700 sm:text-base">
              <PolicyBlock
                title="1. Information We Collect"
                body={[
                  "Personal information: full name, email address, mobile number, professional details (role, experience level, target role, interview preferences), CV uploads, and payment-related information processed via third-party providers.",
                  "Interview information: typed or voice answers, voice recordings/transcripts (where applicable), AI-generated reports/scores, and coaching preferences/bookings.",
                  "Technical information: IP address, browser type, device information, usage activity, and login/session details.",
                ]}
              />

              <PolicyBlock
                title="2. How We Use Your Information"
                body={[
                  "We use information to provide AI interview simulations, generate personalised reports, improve platform quality, schedule/manage coaching, process payments, send service communications, strengthen security, prevent fraud/abuse, and comply with legal obligations.",
                  "We do not sell your personal data to third parties.",
                ]}
              />

              <PolicyBlock
                title="3. CV and Uploaded Content"
                body={[
                  "Uploaded CVs and documents are used only for interview preparation, coaching, and report generation.",
                  "Documents remain confidential and are not shared publicly.",
                  "Access is limited to authorised personnel/systems required for service delivery.",
                  "You are responsible for ensuring uploaded information is accurate and lawful.",
                ]}
              />

              <PolicyBlock
                title="4. Voice Data and AI Processing"
                body={[
                  "For voice interviews, responses may be processed using secure speech-to-text services.",
                  "AI systems may analyse responses for scoring and feedback generation.",
                  "Voice recordings may be retained temporarily for quality review and support purposes.",
                ]}
              />

              <PolicyBlock
                title="5. Payments"
                body={[
                  "Payments are processed through trusted third-party gateways such as Stripe, Razorpay, or similar providers.",
                  "We do not store full card details or sensitive payment credentials on our servers.",
                  "Please review payment provider privacy terms where applicable.",
                ]}
              />

              <PolicyBlock
                title="6. Data Sharing"
                body={[
                  "We may share limited information with payment providers, calendar/scheduling providers, email/communication providers, AI/speech processing providers, internal coaches/authorised support personnel, and legal authorities where required by law.",
                  "We share only what is necessary to deliver services safely and effectively.",
                ]}
              />

              <PolicyBlock
                title="7. Data Retention"
                body={[
                  "We retain information only as long as reasonably necessary for service delivery, coaching history, compliance obligations, security/fraud prevention, and business operations/reporting.",
                  "You may request deletion of personal information subject to legal and operational requirements.",
                ]}
              />

              <PolicyBlock
                title="8. Data Security"
                body={[
                  "We use reasonable technical and organisational safeguards to protect your information from unauthorised access, misuse, or disclosure.",
                  "No online system can guarantee absolute security; users should also take reasonable precautions.",
                ]}
              />

              <PolicyBlock
                title="9. Your Rights"
                body={[
                  "You may request access, correction, deletion, or withdrawal of certain permissions where applicable, and contact us regarding privacy concerns.",
                  "Requests may be subject to identity verification and legal obligations.",
                ]}
              />

              <PolicyBlock
                title="10. Children's Privacy"
                body={[
                  "SelectWise.in is intended for professionals and adult users preparing for career opportunities. We do not knowingly collect data from children under the applicable legal age.",
                ]}
              />

              <PolicyBlock
                title="11. Policy Updates"
                body={[
                  "We may update this Privacy Policy from time to time. Continued use of the platform after updates means acceptance of the revised policy.",
                ]}
              />

              <PolicyBlock
                title="12. Contact Us"
                body={[
                  "For privacy-related questions, contact:",
                  "Email: hello@selectwise.in | Website: www.selectwise.in",
                ]}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function PolicyBlock({
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
