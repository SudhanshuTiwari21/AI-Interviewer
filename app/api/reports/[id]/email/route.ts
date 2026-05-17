import "server-only";

import { and, eq } from "drizzle-orm";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { db, schema } from "@/lib/db/client";
import {
  interviewReportAdminCopyEmail,
  interviewReportCandidateEmail,
  reportUrlForId,
} from "@/lib/email/templates/interview-report";
import { sendMail } from "@/lib/email/transporter";
import type { InterviewReport } from "@/lib/question-engine";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Please sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

  const isAdmin =
    user.role === "admin" || user.role === "super_admin" || user.role === "sub_admin";

  const rows = await db
    .select()
    .from(schema.interviewReports)
    .where(
      isAdmin
        ? eq(schema.interviewReports.id, params.id)
        : and(
            eq(schema.interviewReports.id, params.id),
            eq(schema.interviewReports.userId, user.id),
          ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return fail("user_not_found", "Report not found.", 404);

  const report = row.reportData as InterviewReport;
  const to = (report.email?.trim() || user.email).trim();
  if (!to) {
    return fail("validation_error", "No email address found for this report.", 400);
  }

  const reportUrl = reportUrlForId(params.id);

  try {
    const candidateMail = interviewReportCandidateEmail({ report, reportUrl });
    await sendMail({
      to,
      subject: candidateMail.subject,
      html: candidateMail.html,
      text: candidateMail.text,
    });

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (adminEmail) {
      const adminMail = interviewReportAdminCopyEmail({ report, reportUrl });
      await sendMail({
        to: adminEmail,
        subject: adminMail.subject,
        html: adminMail.html,
        text: adminMail.text,
      });
    }

    return ok({
      sentTo: to,
      adminCopySent: Boolean(adminEmail),
    });
  } catch (err) {
    console.error("[reports/email]", err);
    const message =
      err instanceof Error && err.message.includes("SMTP")
        ? "Email is not configured. Contact support."
        : "Could not send report email. Please try again.";
    return fail("internal_error", message, 500);
  }
}
