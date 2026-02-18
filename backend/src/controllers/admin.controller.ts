import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";

export async function adminListBookings(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    return res.status(403).json({ error: "Tenant resolution required" });
  }

  const rows = await prisma.booking.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      bkgRef: true,
      fullName: true,
      email: true,
      serviceNameSnapshot: true,
      status: true,
      createdAt: true
    }
  });

  return res.status(200).json({
    bookings: rows.map((row) => ({
      bookingRef: row.bkgRef,
      bkgRef: row.bkgRef,
      fullName: row.fullName,
      email: row.email,
      serviceName: row.serviceNameSnapshot,
      status: row.status,
      createdAt: row.createdAt.toISOString()
    }))
  });
}

const patchBookingSchema = z.object({
  status: z.enum(["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"])
});

export async function adminPatchBooking(req: Request, res: Response) {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) {
    return res.status(403).json({ error: "Tenant resolution required" });
  }

  const bookingRef = String(req.params.bookingRef ?? "").trim();
  if (!bookingRef) {
    return res.status(400).json({ error: "bookingRef is required" });
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
          bkgRef: bookingRef
        }
      },
      data: { status: parsed.data.status },
      select: {
        bkgRef: true,
        fullName: true,
        email: true,
        serviceNameSnapshot: true,
        status: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      booking: {
        bookingRef: updated.bkgRef,
        bkgRef: updated.bkgRef,
        fullName: updated.fullName,
        email: updated.email,
        serviceName: updated.serviceNameSnapshot,
        status: updated.status,
        createdAt: updated.createdAt.toISOString()
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ error: "Booking not found" });
    }
    throw error;
  }
}
