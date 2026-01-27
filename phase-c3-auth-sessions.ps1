# ============================================================
# Phase C.3 — Auth & Sessions (PowerShell SAFE)
# ============================================================

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Backend = Join-Path $Root "backend"

function Ensure-Dir($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

Ensure-Dir "$Backend\src\auth"
Ensure-Dir "$Backend\src\middlewares"
Ensure-Dir "$Backend\src\routes"

Write-Host "Applying Phase C.3 (Auth & Sessions)..." -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. Token helpers
# ------------------------------------------------------------
@'
import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
'@ | Set-Content "$Backend\src\auth\tokens.ts" -Encoding UTF8

# ------------------------------------------------------------
# 2. Auth middleware
# ------------------------------------------------------------
@'
import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

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
  next();
}
'@ | Set-Content "$Backend\src\middlewares\auth.ts" -Encoding UTF8

# ------------------------------------------------------------
# 3. Auth controller
# ------------------------------------------------------------
@'
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
'@ | Set-Content "$Backend\src\auth\auth.controller.ts" -Encoding UTF8

# ------------------------------------------------------------
# 4. Routes
# ------------------------------------------------------------
@'
import { Router } from "express";
import { login, logout, me } from "../auth/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, me);

export default router;
'@ | Set-Content "$Backend\src\routes\auth.routes.ts" -Encoding UTF8

# ------------------------------------------------------------
# 5. Patch app.ts safely
# ------------------------------------------------------------
$appPath = "$Backend\src\app.ts"
$app = Get-Content -Raw $appPath

if ($app -notmatch "auth.routes") {
  $app = $app -replace 'import .*error-handler.*',
    '$0' + "`nimport authRoutes from ""./routes/auth.routes"";"
}

if ($app -notmatch 'app.use\("/api/auth"') {
  $app = $app -replace 'app.use\("/api", resolveTenant\);',
    'app.use("/api", resolveTenant);' + "`r`n" +
    'app.use("/api/auth", authRoutes);'
}

Set-Content $appPath $app -Encoding UTF8

Write-Host "Phase C.3 applied successfully." -ForegroundColor Green
Write-Host "Next:"
Write-Host "  cd backend"
Write-Host "  npm run dev"
