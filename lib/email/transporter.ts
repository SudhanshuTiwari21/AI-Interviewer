import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

declare global {
  // eslint-disable-next-line no-var
  var __hiroMailer__: Transporter | undefined;
}

export function getTransporter(): Transporter {
  if (global.__hiroMailer__) return global.__hiroMailer__;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local",
    );
  }

  global.__hiroMailer__ = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return global.__hiroMailer__;
}

export type SendMailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail({ to, subject, html, text }: SendMailArgs) {
  const from =
    process.env.EMAIL_FROM ??
    `Selectwise <${process.env.SMTP_USER ?? "no-reply@selectwise.app"}>`;
  const transporter = getTransporter();
  return transporter.sendMail({ from, to, subject, html, text });
}
