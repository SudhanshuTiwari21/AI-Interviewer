type RequestArgs = {
  bookingId: string;
  candidateName: string;
  candidateEmail: string;
  techArea: string;
  coachName: string;
  startsAt: string;
  amountInr: number;
  approvalUrl: string;
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
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function coachingRequestEmailToCoach(args: RequestArgs) {
  const when = fmtDate(args.startsAt);
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
  const when = fmtDate(args.startsAt);
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

export function coachingApprovedEmail(args: ApprovedArgs) {
  const when = fmtDate(args.startsAt);
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
