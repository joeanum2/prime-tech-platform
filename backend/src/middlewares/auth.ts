import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import type { UserRole } from "@prisma/client";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  const session = await prisma.session.findUnique({
    where: { sessionTokenHash: token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: "Session expired" });
  }

  (req as any).user = session.user;
  (req as any).session = session;
  return next();
}

/**
 * Usage: requireRole("ADMIN") or requireRole("STAFF")
 * Ensures user is authenticated first.
 */
export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ensure auth ran (or run it now)
    if (!(req as any).user) {
      await requireAuth(req, res, () => {});
      if (!(req as any).user) return; // requireAuth already responded
    }

    const user = (req as any).user as { role: UserRole };
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}
