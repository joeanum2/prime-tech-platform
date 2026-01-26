import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { generateToken, hashToken } from "../auth/tokens";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const tenantId = (req as any).tenantId;

  const user = await prisma.user.findFirst({
    where: { email, tenantId }
  });

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const raw = generateToken();
  const hashed = hashToken(raw);

  await prisma.session.create({
    data: {
      tenantId,
      userId: user.id,
      sessionTokenHash: hashed,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  });

  res.cookie("session", hashed, {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  });

  res.json({ ok: true });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.session;
  if (token) {
    await prisma.session.deleteMany({
      where: { sessionTokenHash: token }
    });
  }

  res.clearCookie("session");
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: (req as any).user });
}
