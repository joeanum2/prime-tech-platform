import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const raw = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString();
  const domain = raw.split(":")[0].trim().toLowerCase();

  if (!domain) {
    return res.status(400).json({ error: "Missing Host header" });
  }

  const rec = await prisma.tenantDomain.findUnique({
    where: { domain },
    select: { tenantId: true, tenant: { select: { key: true } } }
  });

  if (!rec) {
    return res.status(404).json({ error: "Tenant not found", domain });
  }

  (req as any).tenantId = rec.tenantId;
  (req as any).tenantKey = rec.tenant.key;
  return next();
}
