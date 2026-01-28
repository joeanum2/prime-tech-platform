import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function adminStats(req: Request, res: Response) {
  const user = (req as any).user;
  const where = user?.tenantId ? { tenantId: user.tenantId } : undefined;

  const [
    users,
    sessions,
    bookings,
    orders,
    invoices,
    receipts,
    licences,
    releases
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.session.count({ where }),
    prisma.booking.count({ where }),
    prisma.order.count({ where }),
    prisma.invoice.count({ where }),
    prisma.receipt.count({ where }),
    prisma.licence.count({ where }),
    prisma.release.count({ where })
  ]);

  return res.json({
    ok: true,
    counts: { users, sessions, bookings, orders, invoices, receipts, licences, releases },
    ts: new Date().toISOString()
  });
}
