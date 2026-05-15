import "server-only";

import type { SupportTicketRow } from "@/lib/db/schema";
import {
  supportRefundRequestAdminEmail,
  supportTicketClosedCandidateEmail,
} from "@/lib/email/templates/support";
import { sendMail } from "@/lib/email/transporter";

export function adminSupportInboxEmail() {
  return (
    process.env.ADMIN_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "hello@selectwise.in"
  );
}

export async function notifyAdminRefundSupportTicket(ticket: SupportTicketRow) {
  const mail = supportRefundRequestAdminEmail({
    id: ticket.id,
    userName: ticket.userName,
    userEmail: ticket.userEmail,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
  });
  await sendMail({
    to: adminSupportInboxEmail(),
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

export async function notifyCandidateSupportTicketClosed(ticket: SupportTicketRow) {
  const mail = supportTicketClosedCandidateEmail({
    id: ticket.id,
    userName: ticket.userName,
    userEmail: ticket.userEmail,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    adminNote: ticket.adminNote,
    createdAt: ticket.createdAt.toISOString(),
  });
  await sendMail({
    to: ticket.userEmail,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
