import type { Request, Response, NextFunction } from "express";

export function authStub(req: Request, _res: Response, next: NextFunction) {
  (req as any).user = null;
  next();
}

export function requireAuth(_req: Request, res: Response) {
  return res.status(401).json({
    error: { code: "AUTH_REQUIRED", message: "Authentication required.", details: { fieldErrors: {}, meta: {} } }
  });
}

export function requireRole(_role: "ADMIN" | "STAFF") {
  return (_req: Request, res: Response) => {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Forbidden.", details: { fieldErrors: {}, meta: {} } }
    });
  };
}
