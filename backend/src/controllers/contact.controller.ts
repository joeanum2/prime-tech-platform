import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { sendMail } from "../lib/mailer";
import { prisma } from "../db/prisma";
import { loadEnv } from "../config/env";
import { contactCustomerEmail } from "../lib/emailTemplates";

const env = loadEnv();

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

  const notifyTo = (env.CONTACT_TO_EMAIL || "bookings@joetechx.co.uk").trim();
  const fromAddress = (env.CONTACT_FROM_EMAIL || notifyTo).trim();

  const { fullName, email, subject, message } = parsed.data;
  const saved = await prisma.contactMessage.create({
    data: {
      fullName,
      email,
      subject,
      message,
      status: "RECEIVED"
    }
  });

  const adminText =
    `New contact message\n\n` +
    `Message ID: ${saved.id}\n` +
    `Full name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Subject: ${subject}\n\n` +
    `${message}\n`;

  const adminHtmlMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const adminHtml =
    `<div style="font-family: Arial, sans-serif; line-height: 1.5;">` +
    `<p><strong>New contact message</strong></p>` +
    `<p>` +
    `<strong>Full name:</strong> ${escapeHtml(fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(email)}<br>` +
    `<strong>Subject:</strong> ${escapeHtml(subject)}` +
    `</p>` +
    `<p>${adminHtmlMessage}</p>` +
    `</div>`;

  const missingSmtp = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter(
    (name) => !(process.env[name] ?? "").trim()
  );

  if (missingSmtp.length > 0) {
    const errorMessage = `SMTP configuration missing: ${missingSmtp.join(", ")}`.slice(0, 1000);
    const failed = await prisma.contactMessage.update({
      where: { id: saved.id },
      data: { status: "EMAIL_FAILED", emailError: errorMessage }
    });
    return res.status(200).json({ ok: true, id: failed.id, status: failed.status });
  }

  let adminSent = false;
  let confirmationSent = false;
  const sendErrors: string[] = [];

  try {
    await sendMail({
      to: notifyTo,
      from: fromAddress,
      replyTo: email,
      subject: `[Contact] ${subject}`,
      text: adminText,
      html: adminHtml
    });
    adminSent = true;
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : typeof err === "string" ? err : "SMTP send failed";
    sendErrors.push(`admin: ${messageText}`);
  }

  const confirmationText =
    `Hello ${fullName},\n\n` +
    `Thank you for contacting Prime Tech Services. We have received your message and will respond within 24 hours.\n\n` +
    `Summary:\n` +
    `Subject: ${subject}\n` +
    `Message: ${message}\n\n` +
    `If you need to add more details, reply to this email.\n\n` +
    `Kind regards,\n` +
    `Prime Tech Services\n`;
  const confirmationHtml = contactCustomerEmail({ fullName, subject, message });

  try {
    await sendMail({
      to: email,
      from: fromAddress,
      replyTo: notifyTo,
      subject: env.CONTACT_CONFIRM_SUBJECT,
      text: confirmationText,
      html: confirmationHtml
    });
    confirmationSent = true;
  } catch (err) {
    const messageText =
      err instanceof Error ? err.message : typeof err === "string" ? err : "SMTP send failed";
    sendErrors.push(`confirmation: ${messageText}`);
  }

  const status = adminSent && confirmationSent
    ? "EMAILED"
    : adminSent || confirmationSent
      ? "EMAIL_PARTIAL"
      : "EMAIL_FAILED";
  const emailError = sendErrors.length > 0 ? sendErrors.join(" | ").slice(0, 1000) : null;

  const updated = await prisma.contactMessage.update({
    where: { id: saved.id },
    data: { status, emailError }
  });
  return res.status(200).json({
    ok: true,
    id: updated.id,
    status: updated.status,
    confirmationSent
  });
}

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

export async function adminListContactMessages(req: Request, res: Response) {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid query parameters", 400, { fieldErrors });
  }

  const rows = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
    select: {
      id: true,
      fullName: true,
      email: true,
      subject: true,
      status: true,
      createdAt: true
    }
  });

  return res.status(200).json({ ok: true, items: rows });
}
