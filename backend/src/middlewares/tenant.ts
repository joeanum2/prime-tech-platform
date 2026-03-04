import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

const DEV_TENANT_ID = "00000000-0000-0000-0000-000000000000";
const DEV_TENANT_KEY = "local";

function normalizeHost(host: string): string {
  let normalized = host.trim().toLowerCase();

  const commaIndex = normalized.indexOf(",");
  if (commaIndex >= 0) {
    normalized = normalized.slice(0, commaIndex).trim();
  }

  normalized = normalized.replace(/:\d+$/, "");
  normalized = normalized.replace(/^(admin|api|www)\./, "");

  return normalized;
}

function assignDevTenant(req: Request) {
  (req as any).tenantId = DEV_TENANT_ID;
  (req as any).tenantKey = DEV_TENANT_KEY;
}

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const hostHeader = req.headers["host"];
  const rawHost = Array.isArray(forwardedHost)
    ? forwardedHost[0]
    : typeof forwardedHost === "string"
      ? forwardedHost
      : Array.isArray(hostHeader)
        ? hostHeader[0]
        : typeof hostHeader === "string"
          ? hostHeader
          : "";
  const domain = normalizeHost(rawHost);

  if (!domain) {
    return res.status(400).json({ error: "Missing Host header" });
  }

  try {
    const rec = await prisma.tenantDomain.findUnique({
      where: { domain },
      select: { tenantId: true, tenant: { select: { key: true } } }
    });

    if (!rec) {
      if (domain === "localhost" || domain === "127.0.0.1") {
        assignDevTenant(req);
        return next();
      }
      return res.status(404).json({ error: "Tenant not found", domain });
    }

    (req as any).tenantId = rec.tenantId;
    (req as any).tenantKey = rec.tenant.key;
    return next();
  } catch {
    if (domain === "localhost" || domain === "127.0.0.1") {
      assignDevTenant(req);
      return next();
    }
    return res.status(503).json({ error: "Tenant resolution unavailable" });
  }
}
