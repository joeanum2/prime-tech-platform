import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { sendMail } from "../lib/mailer";

const testEmailSchema = z.object({
  to: z.string().email("Enter a valid email")
});

export async function adminTestEmail(req: Request, res: Response) {
  const parsed = testEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid test email data", 400, { fieldErrors });
  }

  const ts = new Date().toISOString();
  const subject = "SMTP test email";
  const text = `SMTP test email sent at ${ts}.`;
  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.5;">` +
    `<p><strong>SMTP test email</strong></p>` +
    `<p>Sent at ${ts}</p>` +
    `</div>`;

  const customer = await sendMail({
    to: parsed.data.to,
    subject,
    text,
    html
  });

  const bookings = await sendMail({
    to: "bookings@joetechx.co.uk",
    subject,
    text,
    html
  });

  return res.status(200).json({ ok: true, results: { customer, bookings } });
}
