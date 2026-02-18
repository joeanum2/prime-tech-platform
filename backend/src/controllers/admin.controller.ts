import type { Request, Response } from "express";
import { BookingStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";

function toAdminBooking(row: {
  bkgRef: string;
  fullName: string;
  email: string;
  serviceNameSnapshot: string;
  status: BookingStatus;
  preferredAt: Date;
  createdAt: Date;
}) {
  return {
    bookingRef: row.bkgRef,
    bkgRef: row.bkgRef,
    fullName: row.fullName,
    email: row.email,
    serviceName: row.serviceNameSnapshot,
    status: row.status,
    preferredAt: row.preferredAt.toISOString(),
    createdAt: row.createdAt.toISOString()
  };
}

const listBookingsQuerySchema = z.object({
  status: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export async function adminListBookings(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    return res.status(403).json({ error: "Tenant resolution required" });
  }

  const parsedQuery = listBookingsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedQuery.error.flatten().fieldErrors
    });
  }

  const { status, date, page, pageSize } = parsedQuery.data;
  const normalizedStatus = status?.trim().toUpperCase() ?? "";

  const where: Prisma.BookingWhereInput = { tenantId };
  if (normalizedStatus && normalizedStatus !== "ALL") {
    if (!(normalizedStatus in BookingStatus)) {
      return res.status(400).json({ error: "Invalid status filter" });
    }
    where.status = normalizedStatus as BookingStatus;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    where.preferredAt = { gte: start, lt: end };
  }

  const total = await prisma.booking.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const rows = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      bkgRef: true,
      fullName: true,
      email: true,
      serviceNameSnapshot: true,
      status: true,
      preferredAt: true,
      createdAt: true
    }
  });

  return res.status(200).json({
    bookings: rows.map(toAdminBooking),
    page: safePage,
    pageSize,
    total,
    totalPages
  });
}

export async function adminGetBooking(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    return res.status(403).json({ error: "Tenant resolution required" });
  }

  const bookingRef = String(req.params.bookingRef ?? req.params.bkgRef ?? "").trim();
  if (!bookingRef) {
    return res.status(400).json({ error: "bookingRef is required" });
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
      fullName: true,
      email: true,
      serviceNameSnapshot: true,
      status: true,
      preferredAt: true,
      createdAt: true
    }
  });

  if (!booking) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.status(200).json({ booking: toAdminBooking(booking) });
}

const patchBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus)
});

export async function adminPatchBooking(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    return res.status(403).json({ error: "Tenant resolution required" });
  }

  const bkgRef = String(req.params.bkgRef ?? req.params.bookingRef ?? "").trim();
  if (!bkgRef) {
    return res.status(400).json({ error: "bkgRef is required" });
  }

  const parsed = patchBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid status",
      details: parsed.error.flatten().fieldErrors
    });
  }

  try {
    const updated = await prisma.booking.update({
      where: {
        tenantId_bkgRef: {
          tenantId,
          bkgRef
        }
      },
      data: { status: parsed.data.status },
      select: {
        bkgRef: true,
        fullName: true,
        email: true,
        serviceNameSnapshot: true,
        status: true,
        preferredAt: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      booking: toAdminBooking(updated)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ error: "Booking not found" });
    }
    throw error;
  }
}
