import type { Request, Response, NextFunction } from "express";

/**
 * Phase B.2 stub: capture request host. Phase C will map host -> TenantDomain -> tenantId.
 */
export function tenantStub(req: Request, _res: Response, next: NextFunction) {
  const host = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString().toLowerCase();
  (req as any).tenantHost = host;
  next();
}
