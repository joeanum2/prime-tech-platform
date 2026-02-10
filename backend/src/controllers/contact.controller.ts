import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { sendMail } from "../lib/mailer";

const contactSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message is required").max(4000, "Message is too long")
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitContact(req: Request, res: Response) {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid contact data", 400, { fieldErrors });
  }

  const defaultNotify = (process.env.NODE_ENV ?? "development") !== "production" ? "dev-null@example.com" : "";
  const notifyTo = (process.env.CONTACT_NOTIFY_TO || process.env.ADMIN_NOTIFY_TO || defaultNotify).trim();
  if (!notifyTo) {
    throw new AppError("CONTACT_NOT_CONFIGURED", "Contact notifications not configured", 500);
  }

  const { fullName, email, subject, message } = parsed.data;
  const text =
    `New contact message\n\n` +
    `Full name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Subject: ${subject}\n\n` +
    `${message}\n`;

  const htmlMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.5;">` +
    `<p><strong>New contact message</strong></p>` +
    `<p>` +
    `<strong>Full name:</strong> ${escapeHtml(fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Subject:</strong> ${escapeHtml(subject)}` +
    `</p>` +
    `<p>${htmlMessage}</p>` +
    `</div>`;

  await sendMail({
    to: notifyTo,
    subject: `[Contact] ${subject}`,
    text,
    html
  });

  return res.status(200).json({ ok: true });
}
