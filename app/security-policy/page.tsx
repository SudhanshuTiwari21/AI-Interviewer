import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function SecurityPolicyPage() {
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
              Security Policy
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-600 sm:text-base">
              At SelectWise.in, trust is a core part of our platform. We understand that users
              share sensitive personal and professional information, including resumes, interview
              responses, and coaching details. We take security seriously and continuously work to
              protect your information.
            </p>
          </div>
        </section>

        <section className="container max-w-5xl px-4 py-10 sm:py-14">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-10">
            <div className="space-y-7 text-sm leading-7 text-ink-700 sm:text-base">
              <PolicyBlock
                title="1. Platform Security Approach"
                body={[
                  "We apply reasonable technical, administrative, and operational safeguards to help protect user accounts, resume uploads, interview responses, voice recordings and transcripts, payment-related processes, and coaching/scheduling information.",
                ]}
              />

              <PolicyBlock
                title="2. Secure Authentication"
                body={[
                  "We use secure login practices and account protection measures to reduce unauthorized access.",
                  "Users are responsible for maintaining the confidentiality of their login credentials.",
                ]}
              />

              <PolicyBlock
                title="3. Payment Security"
                body={[
                  "Payments are handled through trusted third-party providers such as Stripe, Razorpay, or equivalent secure payment gateways.",
                  "We do not store sensitive card details directly on our platform.",
                ]}
              />

              <PolicyBlock
                title="4. Data Protection"
                body={[
                  "We aim to protect data through secure access controls, restricted internal access, encrypted communication where applicable, safe handling of uploaded documents, and controlled third-party integrations.",
                ]}
              />

              <PolicyBlock
                title="5. Third-Party Services"
                body={[
                  "Some services such as payment processing, calendar scheduling, email delivery, speech-to-text, and AI analysis may rely on trusted third-party providers.",
                  "We work to select reliable providers, but users should also review their relevant policies where appropriate.",
                ]}
              />

              <PolicyBlock
                title="6. Monitoring and Improvements"
                body={[
                  "We regularly review platform security practices and may improve controls as the platform grows.",
                  "Security is an ongoing responsibility, not a one-time setup.",
                ]}
              />

              <PolicyBlock
                title="7. Responsible User Practices"
                body={[
                  "Users should use strong passwords, avoid sharing account access, protect personal devices, and report suspicious activity immediately.",
                  "Shared responsibility improves security for everyone.",
                ]}
              />

              <PolicyBlock
                title="8. Security Incident Response"
                body={[
                  "If we become aware of a significant security issue affecting user information, we will take reasonable steps to investigate, contain, and respond appropriately.",
                  "Where necessary, we will notify affected users in accordance with applicable obligations.",
                ]}
              />

              <PolicyBlock
                title="9. Contact Security Team"
                body={[
                  "If you notice suspicious activity or have security concerns, please contact:",
                  "Email: hello@selectwise.in | Website: www.selectwise.in",
                  "We appreciate responsible reporting and user trust.",
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
