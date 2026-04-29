type RequestArgs = {
  bookingId: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  coachName: string;
  startsAt: string;
  amountInr: number;
  approvalUrl: string;
  coachTimezone?: string | null;
};

type ApprovedArgs = {
  bookingId: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  coachName: string;
  startsAt: string;
  amountInr: number;
  meetingUrl?: string | null;
  coachTimezone?: string | null;
};

type RefundApprovedArgs = {
  bookingId: string;
  candidateName: string;
  techArea: string;
  refundAmountInr: number;
  remainingAmountInr: number;
  adminNote?: string | null;
  status: "refund_pending" | "partially_refunded" | "refunded";
};

type RefundRejectedArgs = {
  bookingId: string;
  candidateName: string;
  techArea: string;
  amountInr: number;
  adminNote?: string | null;
};

type CoachOnboardingArgs = {
  coachName: string;
  coachEmail: string;
  dashboardUrl: string;
  supportEmail?: string | null;
};

type CoachingFeedbackRequestArgs = {
  candidateName: string;
  coachName: string;
  techArea: string;
  startsAt: string;
  coachTimezone?: string | null;
  feedbackUrl: string;
};

function fmtDate(iso: string, timezone?: string | null) {
  const resolvedTimezone = timezone?.trim() || "Asia/Kolkata";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: resolvedTimezone,
  });
}

export function coachingRequestEmailToCoach(args: RequestArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `Action needed: coaching request from ${args.candidateName}`,
    html: `<p>Hi ${args.coachName},</p>
<p>You have a new paid coaching request on SelectWise.</p>
<ul>
  <li><strong>Candidate:</strong> ${args.candidateName} (${args.candidateEmail})</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
  <li><strong>Amount paid:</strong> ₹${args.amountInr}</li>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
</ul>
<p><a href="${args.approvalUrl}">Approve this booking</a></p>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.coachName},
New paid coaching request:
- Candidate: ${args.candidateName} (${args.candidateEmail})
- Tech area: ${args.techArea}
- Session: ${when}
- Amount paid: ₹${args.amountInr}
- Booking ID: ${args.bookingId}

Approve: ${args.approvalUrl}`,
  };
}

export function coachingRequestEmailToAdmin(args: RequestArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `New coaching booking request (${args.techArea})`,
    html: `<p>New coaching booking request received.</p>
<ul>
  <li><strong>Candidate:</strong> ${args.candidateName} (${args.candidateEmail})</li>
  <li><strong>Coach:</strong> ${args.coachName}</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
  <li><strong>Amount paid:</strong> ₹${args.amountInr}</li>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
</ul>`,
    text: `New coaching booking request:
- Candidate: ${args.candidateName} (${args.candidateEmail})
- Coach: ${args.coachName}
- Tech area: ${args.techArea}
- Session: ${when}
- Amount paid: ₹${args.amountInr}
- Booking ID: ${args.bookingId}`,
  };
}

export function coachingRequestEmailToCandidate(args: RequestArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `Coaching booking received (${args.techArea})`,
    html: `<p>Hi ${args.candidateName},</p>
<p>Your paid coaching request has been received successfully on SelectWise.</p>
<ul>
  <li><strong>Coach:</strong> ${args.coachName}</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
  <li><strong>Amount paid:</strong> ₹${args.amountInr}</li>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
</ul>
<p>Your coach has been notified for approval. We will email you once it is confirmed.</p>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.candidateName},
Your paid coaching request has been received.
- Coach: ${args.coachName}
- Tech area: ${args.techArea}
- Session: ${when}
- Amount paid: ₹${args.amountInr}
- Booking ID: ${args.bookingId}

Your coach has been notified for approval.`,
  };
}

export function coachingApprovedEmail(args: ApprovedArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `Coaching session confirmed (${args.techArea})`,
    html: `<p>Your coaching session is confirmed.</p>
<ul>
  <li><strong>Candidate:</strong> ${args.candidateName} (${args.candidateEmail})</li>
  <li><strong>Coach:</strong> ${args.coachName}</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
  <li><strong>Amount paid:</strong> ₹${args.amountInr}</li>
  ${args.meetingUrl ? `<li><strong>Meeting link:</strong> <a href="${args.meetingUrl}">${args.meetingUrl}</a></li>` : ""}
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
</ul>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Coaching session confirmed:
- Candidate: ${args.candidateName} (${args.candidateEmail})
- Coach: ${args.coachName}
- Tech area: ${args.techArea}
- Session: ${when}
- Amount paid: ₹${args.amountInr}
- Meeting link: ${args.meetingUrl ?? "Will be shared shortly"}
- Booking ID: ${args.bookingId}`,
  };
}

export function coachingApprovedEmailToCoach(args: ApprovedArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `Session confirmed: ${args.candidateName} (${args.techArea})`,
    html: `<p>Hi ${args.coachName},</p>
<p>Your coaching session is confirmed on SelectWise.</p>
<ul>
  <li><strong>Candidate:</strong> ${args.candidateName} (${args.candidateEmail})</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
  ${args.meetingUrl ? `<li><strong>Join link:</strong> <a href="${args.meetingUrl}">${args.meetingUrl}</a></li>` : ""}
</ul>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.coachName},
Your coaching session is confirmed.
- Candidate: ${args.candidateName} (${args.candidateEmail})
- Tech area: ${args.techArea}
- Session: ${when}
- Booking ID: ${args.bookingId}
- Join link: ${args.meetingUrl ?? "Will be shared shortly"}`,
  };
}

export function coachingRefundApprovedEmail(args: RefundApprovedArgs) {
  const statusLabel =
    args.status === "refunded"
      ? "Refund completed"
      : args.status === "partially_refunded"
        ? "Partial refund completed"
        : "Refund initiated";
  return {
    subject: `${statusLabel} (${args.techArea})`,
    html: `<p>Hi ${args.candidateName},</p>
<p>Your refund request has been approved.</p>
<ul>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
  <li><strong>Track:</strong> ${args.techArea}</li>
  <li><strong>Refund amount:</strong> ₹${args.refundAmountInr}</li>
  <li><strong>Status:</strong> ${statusLabel}</li>
  <li><strong>Remaining paid amount:</strong> ₹${args.remainingAmountInr}</li>
  ${args.adminNote ? `<li><strong>Admin note:</strong> ${args.adminNote}</li>` : ""}
</ul>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.candidateName},
Your refund request is approved.
- Booking ID: ${args.bookingId}
- Track: ${args.techArea}
- Refund amount: ₹${args.refundAmountInr}
- Status: ${statusLabel}
- Remaining paid amount: ₹${args.remainingAmountInr}
- Admin note: ${args.adminNote ?? "N/A"}`,
  };
}

export function coachingRefundRejectedEmail(args: RefundRejectedArgs) {
  const adminNote = args.adminNote ?? "N/A";
  return {
    subject: `Refund request update (${args.techArea})`,
    html: `<p>Hi ${args.candidateName},</p>
<p>Your refund request has been reviewed and could not be approved at this time.</p>
<ul>
  <li><strong>Booking ID:</strong> ${args.bookingId}</li>
  <li><strong>Track:</strong> ${args.techArea}</li>
  <li><strong>Paid amount:</strong> ₹${args.amountInr}</li>
  ${args.adminNote ? `<li><strong>Admin note:</strong> ${args.adminNote}</li>` : ""}
</ul>
<p>If you need more help, please contact support.</p>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.candidateName},
Your refund request has been reviewed and was not approved.
- Booking ID: ${args.bookingId}
- Track: ${args.techArea}
- Paid amount: ₹${args.amountInr}
- Admin note: ${adminNote}`,
  };
}

export function coachOnboardingEmail(args: CoachOnboardingArgs) {
  const supportEmail = args.supportEmail?.trim() || "hello@selectwise.in";
  return {
    subject: "Welcome onboard as a coach at SelectWise",
    html: `<p>Hi ${args.coachName},</p>
<p>You have been added as a coach on SelectWise.</p>
<p>You can now sign in and start managing your coaching requests and sessions.</p>
<ul>
  <li><strong>Coach account:</strong> ${args.coachEmail}</li>
  <li><strong>Coach dashboard:</strong> <a href="${args.dashboardUrl}">${args.dashboardUrl}</a></li>
</ul>
<p>If you need any help getting started, reply to this email or contact us at ${supportEmail}.</p>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.coachName},
You have been added as a coach on SelectWise.

- Coach account: ${args.coachEmail}
- Coach dashboard: ${args.dashboardUrl}

If you need help getting started, contact us at ${supportEmail}.`,
  };
}

export function coachingFeedbackRequestEmail(args: CoachingFeedbackRequestArgs) {
  const when = fmtDate(args.startsAt, args.coachTimezone);
  return {
    subject: `How was your coaching session with ${args.coachName}?`,
    html: `<p>Hi ${args.candidateName},</p>
<p>Hope your coaching session went well.</p>
<ul>
  <li><strong>Coach:</strong> ${args.coachName}</li>
  <li><strong>Tech area:</strong> ${args.techArea}</li>
  <li><strong>Session:</strong> ${when}</li>
</ul>
<p>Please rate your coach and share your feedback:</p>
<p><a href="${args.feedbackUrl}">Rate this coaching session</a></p>
<p>Thanks,<br/>SelectWise</p>`,
    text: `Hi ${args.candidateName},
Hope your coaching session went well.

- Coach: ${args.coachName}
- Tech area: ${args.techArea}
- Session: ${when}

Please rate your coach and share feedback:
${args.feedbackUrl}`,
  };
}
