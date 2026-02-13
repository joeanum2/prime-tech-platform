import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { serviceCatalog } from "../data.services";
import { sendMail } from "../lib/mailer";
import { renderBookingAdminEmail, renderBookingCustomerEmail } from "../lib/emailTemplates";

const createBookingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  serviceSlug: z.string().min(1),
  preferredDate: z.string().min(1),
  notes: z.string().max(2000).optional().or(z.literal(""))
});

const trackSchema = z.object({
  booking: z.string().min(1),
  email: z.string().email()
});

function makeBookingRef() {
  return `BKG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function makeTrackUrl(bkgRef: string, email: string) {
  const base = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/track?booking=${encodeURIComponent(bkgRef)}&email=${encodeURIComponent(email)}`;
}

export async function createBooking(req: Request, res: Response) {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid booking data", 400, { fieldErrors });
  }

  const service = serviceCatalog.find((item) => item.slug === parsed.data.serviceSlug);
  if (!service) {
    throw new AppError("SERVICE_NOT_FOUND", "Selected service was not found", 404);
  }

  const booking = {
    bkgRef: makeBookingRef(),
    status: "NEW",
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    serviceSlug: service.slug,
    serviceName: service.name,
    preferredDate: parsed.data.preferredDate,
    notes: parsed.data.notes || null
  };

  const customerEmail = renderBookingCustomerEmail(booking);
  const adminEmail = renderBookingAdminEmail(booking);
  const trackUrl = makeTrackUrl(booking.bkgRef, booking.email);
  if (trackUrl) {
    console.info(`[booking-email] tracking link included for ${booking.bkgRef}: ${trackUrl}`);
  }
  await sendMail({
    to: booking.email,
    subject: customerEmail.subject,
    text: customerEmail.text,
    html: customerEmail.html
  });
  await sendMail({
    to: "bookings@joetechx.co.uk",
    subject: adminEmail.subject,
    text: adminEmail.text,
    html: adminEmail.html
  });

  return res.status(201).json({ ok: true, booking, bkgRef: booking.bkgRef });
}

export function trackBooking(req: Request, res: Response) {
  const parsed = trackSchema.safeParse(req.query);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid tracking query", 400, { fieldErrors });
  }

  return res.status(200).json({
    ok: true,
    booking: {
      bkgRef: parsed.data.booking,
      email: parsed.data.email,
      status: "NEW"
    }
  });
}
