import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { loadEnv } from "../config/env";
import { generateToken, hashToken } from "../auth/tokens";

const env = loadEnv();
const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  const tenantId = (req as any).tenantId as string | undefined;

  if (!tenantId) {
    return res.status(400).json({ error: "Tenant not resolved" });
  }

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findFirst({
    where: { email, tenantId }
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const raw = generateToken();
  const hashed = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tenantId,
      userId: user.id,
      sessionTokenHash: hashed,
      expiresAt
    }
  });

  res.cookie(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: env.COOKIE_SAMESITE,
    secure: env.COOKIE_SECURE,
    maxAge: SESSION_TTL_MS
  });

  return res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token.length > 0) {
    const hashed = hashToken(token);
    await prisma.session.deleteMany({
      where: { sessionTokenHash: hashed }
    });
  }

  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: env.COOKIE_SAMESITE,
    secure: env.COOKIE_SECURE
  });

  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser });
}
