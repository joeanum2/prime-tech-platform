Param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend"
$authDir = Join-Path $backendRoot "src\\auth"
$middlewaresDir = Join-Path $backendRoot "src\\middlewares"
$prismaDir = Join-Path $backendRoot "prisma"

New-Item -ItemType Directory -Force -Path $authDir | Out-Null
New-Item -ItemType Directory -Force -Path $middlewaresDir | Out-Null
New-Item -ItemType Directory -Force -Path $prismaDir | Out-Null

$authController = @'
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
'@

Set-Content -Path (Join-Path $authDir "auth.controller.ts") -Value $authController -Encoding UTF8

$passwordHelper = @'
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
'@

Set-Content -Path (Join-Path $authDir "password.ts") -Value $passwordHelper -Encoding UTF8

$authMiddleware = @'
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
'@

Set-Content -Path (Join-Path $middlewaresDir "auth.ts") -Value $authMiddleware -Encoding UTF8

$seedFile = @'
import { hashPassword } from "../src/auth/password";
import { prisma } from "../src/db/prisma";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { key: "primetech" },
    update: { name: "Prime Tech Services", status: "ACTIVE" },
    create: { key: "primetech", name: "Prime Tech Services", status: "ACTIVE" },
    select: { id: true, key: true }
  });

  const domains = ["localhost", "127.0.0.1"];

  for (const d of domains) {
    await prisma.tenantDomain.upsert({
      where: { domain: d },
      update: { tenantId: tenant.id, isPrimary: d === "localhost" },
      create: { domain: d, tenantId: tenant.id, isPrimary: d === "localhost" }
    });
  }

  const adminEmail = "admin@primetech.local";
  const adminPassword = "PrimeTechAdmin123!";
  const passwordHash = await hashPassword(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: { fullName: "Prime Tech Admin", role: "ADMIN", passwordHash },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      fullName: "Prime Tech Admin",
      passwordHash,
      role: "ADMIN"
    },
    select: { id: true, email: true, role: true }
  });

  console.log("Seeded tenant:", tenant.key);
  console.log("Seeded admin user:", adminUser.email, adminUser.role);
  console.log("Admin password:", adminPassword);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
'@

Set-Content -Path (Join-Path $prismaDir "seed.ts") -Value $seedFile -Encoding UTF8

Write-Host "Phase 2.1 auth/session files written."
