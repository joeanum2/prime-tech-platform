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

  let whereClause = Prisma.sql`"tenantId" = CAST(${tenantId} AS uuid)`;
  if (normalizedStatus && normalizedStatus !== "ALL") {
    if (!(normalizedStatus in BookingStatus)) {
      return res.status(400).json({ error: "Invalid status filter" });
    }
    whereClause = Prisma.sql`${whereClause} AND "status" = ${normalizedStatus as BookingStatus}`;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    whereClause = Prisma.sql`${whereClause} AND (("preferredAt" >= ${start} AND "preferredAt" <= ${end}) OR ("preferredAt" IS NULL AND "createdAt" >= ${start} AND "createdAt" <= ${end}))`;
  }

  const whereSql = Prisma.sql`WHERE ${whereClause}`;
  const countRows = await prisma.$queryRaw<Array<{ total: bigint }>>(
    Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "Booking" ${whereSql}`
  );
  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  const rows = await prisma.$queryRaw<
    Array<{
      bkgRef: string;
      fullName: string;
      email: string;
      serviceNameSnapshot: string;
      status: BookingStatus;
      preferredAt: Date;
      createdAt: Date;
      notes: string | null;
    }>
  >(
    Prisma.sql`SELECT "bkgRef", "fullName", email, "serviceNameSnapshot", status, "preferredAt", "createdAt", notes
               FROM "Booking"
               ${whereSql}
               ORDER BY "createdAt" DESC
               OFFSET ${skip}
               LIMIT ${pageSize}`
  );

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
