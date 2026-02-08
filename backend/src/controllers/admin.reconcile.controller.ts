import { Request, Response } from "express";
import { prisma } from "../db/prisma";

/**
 * Admin reconciliation endpoints.
 * All must be protected by requireRole("ADMIN") in routes.
 * Tenant scoping is enforced by tenantId from req.user.
 */
function mustAdmin(req: Request) {
  const user = (req as any).user;
  if (!user) return { ok: false as const, status: 401, error: "Not authenticated" };
  if (user.role !== "ADMIN") return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, user };
}

export async function adminHealth(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  return res.json({ ok: true, tenantId: a.user.tenantId });
}

export async function adminListOrders(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const orders = await prisma.order.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { items: true, invoice: true, receipt: true, payment: true }
  });

  return res.json({ orders });
}

export async function adminListInvoices(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ invoices });
}

export async function adminListReceipts(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const receipts = await prisma.receipt.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ receipts });
}

export async function adminListPayments(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const payments = await prisma.payment.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ payments });
}

export async function adminListWebhookEvents(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const webhookEvents = await prisma.webhookEvent.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ webhookEvents });
}

export async function adminListEntitlements(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const entitlements = await prisma.entitlement.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { grantedAt: "desc" }
  });

  return res.json({ entitlements });
}

export async function adminListLicences(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const licences = await prisma.licence.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { activation: true }
  });

  return res.json({ licences });
}

export async function adminListActivations(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const activations = await prisma.activation.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { activatedAt: "desc" }
  });

  return res.json({ activations });
}
