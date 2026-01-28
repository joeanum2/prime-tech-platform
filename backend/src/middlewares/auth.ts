import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";
import type { UserRole } from "@prisma/client";
import { hashToken } from "../auth/tokens";

const SESSION_COOKIE = "session";

async function resolveSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || token.length === 0) return null;

  const hashed = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { sessionTokenHash: hashed },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) return null;

  const tenantId = (req as any).tenantId as string | undefined;
  if (tenantId && session.tenantId !== tenantId) return null;

  return session;
}

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  const session = await resolveSession(req);
  if (!session) return next();

  (req as any).user = session.user;
  (req as any).session = session;
  return next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await resolveSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
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
    if (!(req as any).user) {
      await requireAuth(req, res, () => {});
      if (!(req as any).user) return;
    }

    const user = (req as any).user as { role: UserRole };
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}
