import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { serviceCatalog } from "../data.services";
import { sendMail } from "../lib/mailer";
import { renderBookingAdminEmail, renderBookingCustomerEmail } from "../lib/emailTemplates";
import { prisma } from "../db/prisma";
import { makeBookingTrackUrl } from "../lib/siteUrl";

const createBookingSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  serviceSlug: z.string().min(1),
  preferredDate: z.string().min(1),
  notes: z.string().max(2000).optional().or(z.literal(""))
});

const trackSchema = z.object({
  booking: z.string().min(3).max(64),
  email: z.string().email()
});

function makeBookingRef() {
  return `BKG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
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

  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    throw new AppError("FORBIDDEN", "Tenant resolution required", 403);
  }

  const preferredAt = new Date(parsed.data.preferredDate);
  if (Number.isNaN(preferredAt.getTime())) {
    throw new AppError("VALIDATION_ERROR", "Invalid preferred date", 400, {
      fieldErrors: { preferredDate: ["Invalid date"] }
    });
  }

  const booking = {
    bkgRef: makeBookingRef(),
    status: "NEW" as const,
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    serviceSlug: service.slug,
    serviceName: service.name,
    preferredDate: preferredAt.toISOString(),
    notes: parsed.data.notes || null
  };

  const created = await prisma.booking.create({
    data: {
      tenantId,
      bkgRef: booking.bkgRef,
      status: booking.status,
      fullName: booking.fullName,
      email: booking.email,
      serviceSlug: booking.serviceSlug,
      serviceNameSnapshot: booking.serviceName,
      priceSnapshot: service.price,
      currency: service.currency,
      preferredAt,
      notes: booking.notes
    }
  });

  const customerEmail = renderBookingCustomerEmail(booking);
  const adminEmail = renderBookingAdminEmail(booking);
  const trackUrl = makeBookingTrackUrl(booking.bkgRef, booking.email);
  if ((process.env.NODE_ENV ?? "development") !== "production") {
    console.info(`[booking-email] tracking link for ${booking.bkgRef}: ${trackUrl || "(missing SITE_URL)"}`);
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

  return res.status(201).json({
    ok: true,
    booking: {
      bkgRef: created.bkgRef,
      status: created.status,
      fullName: created.fullName,
      email: created.email,
      serviceSlug: created.serviceSlug,
      serviceNameSnapshot: created.serviceNameSnapshot,
      preferredAt: created.preferredAt,
      notes: created.notes,
      createdAt: created.createdAt
    },
    bkgRef: created.bkgRef
  });
}

export async function trackBooking(req: Request, res: Response) {
  const parsed = trackSchema.safeParse(req.query);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new AppError("VALIDATION_ERROR", "Invalid tracking query", 400, { fieldErrors });
  }

  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    throw new AppError("FORBIDDEN", "Tenant resolution required", 403);
  }

  const bookingRef = parsed.data.booking.trim();
  const email = parsed.data.email.trim().toLowerCase();

  if ((process.env.NODE_ENV ?? "development") !== "production") {
    console.info(`[track] booking=${bookingRef} email=${email}`);
  }

  const booking = await prisma.booking.findUnique({
    where: {
      tenantId_bkgRef: {
        tenantId,
        bkgRef: bookingRef
      }
    },
    select: {
      bkgRef: true,
      status: true,
      serviceNameSnapshot: true,
      preferredAt: true,
      fullName: true,
      email: true,
      createdAt: true
    }
  });

  if (!booking) {
    throw new AppError("BOOKING_NOT_FOUND", "Booking not found", 404);
  }

  if (booking.email.trim().toLowerCase() !== email) {
    throw new AppError("FORBIDDEN", "Booking email does not match", 403);
  }

  return res.status(200).json({
    ok: true,
    booking: {
      bookingRef: booking.bkgRef,
      status: booking.status,
      serviceName: booking.serviceNameSnapshot,
      preferredDate: booking.preferredAt.toISOString(),
      fullName: booking.fullName,
      email: booking.email,
      createdAt: booking.createdAt.toISOString()
    }
  });
}
