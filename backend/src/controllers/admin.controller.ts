import type { Request, Response } from "express";
import { notImplemented } from "./_common.controller";
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

export function adminPatchBooking(req: Request, res: Response) {
  return notImplemented(req, res);
}
