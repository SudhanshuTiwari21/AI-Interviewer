import type { InterviewReport } from "@/lib/question-engine";

function appBase() {
  return (process.env.APP_URL ?? "https://selectwise.in").replace(/\/+$/, "");
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function interviewReportCandidateEmail(args: {
  report: InterviewReport;
  reportUrl: string;
}) {
  const { report, reportUrl } = args;
  const when = fmtWhen(report.generatedAt);
  const strengths = report.strengths.slice(0, 5).map((s) => `<li>${s}</li>`).join("");
  const improvements = report.improvements
    .slice(0, 5)
    .map((s) => `<li>${s}</li>`)
    .join("");

  return {
    subject: `Your SelectWise interview report — ${report.overall}/100`,
    html: `<p>Hi ${report.candidate},</p>
<p>Here is your interview report from SelectWise.</p>
<ul>
  <li><strong>Role:</strong> ${report.role} · ${report.level}</li>
  <li><strong>Score:</strong> ${report.overall}/100</li>
  <li><strong>Recommendation:</strong> ${report.rating}</li>
  <li><strong>Completed:</strong> ${when}</li>
</ul>
<p><strong>Strengths</strong></p>
<ul>${strengths || "<li>See full report</li>"}</ul>
<p><strong>Areas to improve</strong></p>
<ul>${improvements || "<li>See full report</li>"}</ul>
<p><a href="${reportUrl}">View your full report online</a></p>
<p>— SelectWise</p>`,
    text: `Hi ${report.candidate},

Here is your SelectWise interview report.

Role: ${report.role} · ${report.level}
Score: ${report.overall}/100
Recommendation: ${report.rating}
Completed: ${when}

Strengths:
${report.strengths.slice(0, 5).map((s) => `- ${s}`).join("\n") || "- See full report"}

Areas to improve:
${report.improvements.slice(0, 5).map((s) => `- ${s}`).join("\n") || "- See full report"}

Full report: ${reportUrl}

— SelectWise`,
  };
}

export function interviewReportAdminCopyEmail(args: {
  report: InterviewReport;
  reportUrl: string;
}) {
  const { report, reportUrl } = args;
  return {
    subject: `[SelectWise] Interview report copy — ${report.candidate} (${report.overall}/100)`,
    html: `<p>Interview report copy for admin records.</p>
<ul>
  <li><strong>Candidate:</strong> ${report.candidate} (${report.email})</li>
  <li><strong>Role:</strong> ${report.role} · ${report.level}</li>
  <li><strong>Score:</strong> ${report.overall}/100 · ${report.rating}</li>
  <li><strong>Report ID:</strong> ${report.id}</li>
</ul>
<p><a href="${reportUrl}">Open report</a></p>`,
    text: `Interview report copy

Candidate: ${report.candidate} (${report.email})
Role: ${report.role} · ${report.level}
Score: ${report.overall}/100 · ${report.rating}
Report ID: ${report.id}

${reportUrl}`,
  };
}

export function reportUrlForId(reportId: string) {
  return `${appBase()}/interview/${reportId}/report`;
}
