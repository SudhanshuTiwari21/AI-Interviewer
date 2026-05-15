type TicketEmailArgs = {
  id: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  adminNote?: string | null;
  createdAt: string;
};

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function supportRefundRequestAdminEmail(args: TicketEmailArgs) {
  const when = fmtWhen(args.createdAt);
  return {
    subject: `[SelectWise] New refund request — ${args.subject}`,
    html: `<p>A candidate submitted a refund support ticket.</p>
<ul>
  <li><strong>Name:</strong> ${args.userName}</li>
  <li><strong>Email:</strong> ${args.userEmail}</li>
  <li><strong>Category:</strong> ${args.category}</li>
  <li><strong>Priority:</strong> ${args.priority}</li>
  <li><strong>Subject:</strong> ${args.subject}</li>
  <li><strong>Raised:</strong> ${when}</li>
  <li><strong>Ticket ID:</strong> ${args.id}</li>
</ul>
<p><strong>Description</strong></p>
<p>${args.description.replace(/\n/g, "<br/>")}</p>
<p>Review in the admin dashboard under Refunds or Support tickets.</p>`,
    text: `New refund support ticket
Name: ${args.userName}
Email: ${args.userEmail}
Category: ${args.category}
Subject: ${args.subject}
Raised: ${when}
Ticket ID: ${args.id}

Description:
${args.description}`,
  };
}

export function supportTicketClosedCandidateEmail(args: TicketEmailArgs) {
  const when = fmtWhen(args.createdAt);
  const noteBlock = args.adminNote?.trim()
    ? `<p><strong>Team note:</strong> ${args.adminNote.trim().replace(/\n/g, "<br/>")}</p>`
    : "";
  const noteText = args.adminNote?.trim()
    ? `\n\nTeam note:\n${args.adminNote.trim()}`
    : "";

  return {
    subject: `Your SelectWise support ticket is closed — ${args.subject}`,
    html: `<p>Hi ${args.userName},</p>
<p>Your support ticket has been marked <strong>closed</strong>.</p>
<ul>
  <li><strong>Subject:</strong> ${args.subject}</li>
  <li><strong>Category:</strong> ${args.category}</li>
  <li><strong>Originally raised:</strong> ${when}</li>
  <li><strong>Ticket ID:</strong> ${args.id}</li>
</ul>
${noteBlock}
<p>If you still need help, reply to this email or raise a new ticket from your SelectWise account.</p>
<p>— SelectWise Support</p>`,
    text: `Hi ${args.userName},

Your support ticket has been marked closed.

Subject: ${args.subject}
Category: ${args.category}
Originally raised: ${when}
Ticket ID: ${args.id}${noteText}

If you still need help, reply to this email or raise a new ticket from your SelectWise account.

— SelectWise Support`,
  };
}
