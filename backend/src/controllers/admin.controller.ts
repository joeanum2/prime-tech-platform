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
  notes: string | null;
}) {
  return {
    bookingRef: row.bkgRef,
    bkgRef: row.bkgRef,
    fullName: row.fullName,
    email: row.email,
    serviceName: row.serviceNameSnapshot,
    status: row.status,
    preferredAt: row.preferredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    notes: row.notes
  };
}

export async function adminListBookings(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId as string | undefined;
    if (!tenantId) {
      return res.status(403).json({ error: "Tenant resolution required" });
    }

    const statusRaw = String(req.query.status ?? "ALL").trim().toUpperCase();
    const dateRaw = String(req.query.date ?? "").trim();

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      50
    );

    const where: any = { tenantId };

    // Status filter
    if (statusRaw !== "ALL") {
      if (!Object.values(BookingStatus).includes(statusRaw as BookingStatus)) {
        return res.status(400).json({
          error: "Invalid status filter",
          allowed: Object.values(BookingStatus)
        });
      }
      where.status = statusRaw as BookingStatus;
    }

    // Date filter
    if (dateRaw !== "") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      const start = new Date(`${dateRaw}T00:00:00.000Z`);
      const end = new Date(`${dateRaw}T23:59:59.999Z`);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      where.OR = [
        { preferredAt: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } }
      ];
    }

    const total = await prisma.booking.count({ where });

    const rows = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        bkgRef: true,
        fullName: true,
        email: true,
        serviceNameSnapshot: true,
        status: true,
        preferredAt: true,
        createdAt: true,
        notes: true
      }
    });

    return res.json({
      bookings: rows.map(toAdminBooking),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    console.error("ADMIN BOOKINGS ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: String(err)
    });
  }
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
      createdAt: true,
      notes: true
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
        createdAt: true,
        notes: true
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
