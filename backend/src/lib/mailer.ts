import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getMailConfig } from "../config/mail";

let cached: Transporter | null = null;

export function getMailer(): Transporter {
  if (cached) return cached;

  const cfg = getMailConfig();

  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure, // false for 587 (STARTTLS), true for 465 (SSL)
    auth: { user: cfg.user, pass: cfg.pass }
  });

  return cached;
}

export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const cfg = getMailConfig();
  const transporter = getMailer();

  const info = await transporter.sendMail({
    from: cfg.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html
  });

  return { messageId: info.messageId };
}
