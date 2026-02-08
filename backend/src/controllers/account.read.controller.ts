import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middlewares/auth";

/**
 * GET /api/account/orders
 * Requires auth. Returns orders for current user, scoped to tenant.
 */
export async function listMyOrders(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const orders = await prisma.order.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      invoice: true,
      receipt: true,
      payment: true,
      items: true
    }
  });

  return res.json({ orders });
}

/**
 * GET /api/account/entitlements
 * Requires auth. Returns entitlements for current user, scoped to tenant.
 */
export async function listMyEntitlements(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const entitlements = await prisma.entitlement.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    orderBy: { grantedAt: "desc" }
  });

  return res.json({ entitlements });
}
