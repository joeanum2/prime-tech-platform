$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run this from repo root. backend/ not found." }

Write-Host "== Phase B.2 :: Repo hygiene + runtime wiring ==" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Backend: $Backend"

# -----------------------------
# 1) Repo hygiene: .gitignore + untrack node_modules
# -----------------------------
$rootGitignore = Join-Path $Root ".gitignore"
if (-not (Test-Path $rootGitignore)) {
@'
# Node
node_modules/
**/node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env
.env
.env.*
!.env.example

# Build
dist/
.next/
out/
coverage/

# OS
.DS_Store
Thumbs.db
'@ | Set-Content -Encoding UTF8 $rootGitignore
  Write-Host "Created .gitignore at repo root" -ForegroundColor Green
} else {
  Write-Host ".gitignore exists (left unchanged)" -ForegroundColor Yellow
}

$backendGitignore = Join-Path $Backend ".gitignore"
if (-not (Test-Path $backendGitignore)) {
@'
node_modules/
dist/
.env
.env.*
!.env.example
'@ | Set-Content -Encoding UTF8 $backendGitignore
  Write-Host "Created backend/.gitignore" -ForegroundColor Green
} else {
  Write-Host "backend/.gitignore exists (left unchanged)" -ForegroundColor Yellow
}

Write-Host "Untracking backend/node_modules (kept on disk)..." -ForegroundColor Cyan
git rm -r --cached backend/node_modules 2>$null | Out-Null
Write-Host "Done (if it was tracked, it is now removed from Git index)." -ForegroundColor Green

# -----------------------------
# 2) Ensure middleware stubs exist (no DB yet)
# -----------------------------
$mwDir = Join-Path $Backend "src/middlewares"
if (-not (Test-Path $mwDir)) { New-Item -ItemType Directory -Path $mwDir | Out-Null }

@'
import type { Request, Response, NextFunction } from "express";

/**
 * Phase B.2 stub: capture request host. Phase C will map host -> TenantDomain -> tenantId.
 */
export function tenantStub(req: Request, _res: Response, next: NextFunction) {
  const host = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString().toLowerCase();
  (req as any).tenantHost = host;
  next();
}
'@ | Set-Content -Encoding UTF8 (Join-Path $mwDir "tenant.ts")

@'
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
'@ | Set-Content -Encoding UTF8 (Join-Path $mwDir "auth.ts")

# -----------------------------
# 3) Controllers: common + auth has contract-safe me/logout; others are NOT_IMPLEMENTED
# -----------------------------
$controllersDir = Join-Path $Backend "src/controllers"
if (-not (Test-Path $controllersDir)) { New-Item -ItemType Directory -Path $controllersDir | Out-Null }

@'
import type { Request, Response } from "express";
import { AppError } from "../domain/errors";

export function notImplemented(_req: Request, _res: Response): never {
  throw new AppError("NOT_IMPLEMENTED", "Not implemented yet.", 501);
}
'@ | Set-Content -Encoding UTF8 (Join-Path $controllersDir "_common.controller.ts")

@'
import type { Request, Response } from "express";
import { notImplemented } from "./_common.controller";

export function register(req: Request, res: Response) { return notImplemented(req, res); }
export function login(req: Request, res: Response) { return notImplemented(req, res); }
export function verifyEmail(req: Request, res: Response) { return notImplemented(req, res); }
export function requestPasswordReset(req: Request, res: Response) { return notImplemented(req, res); }
export function resetPassword(req: Request, res: Response) { return notImplemented(req, res); }

export function me(_req: Request, res: Response) {
  return res.status(200).json({ user: null });
}

export function logout(_req: Request, res: Response) {
  return res.status(204).send();
}
'@ | Set-Content -Encoding UTF8 (Join-Path $controllersDir "auth.controller.ts")

# Generate simple NOT_IMPLEMENTED controllers
$stubControllers = @(
  "checkout.controller.ts:checkoutStart",
  "orders.controller.ts:listOrders,getOrder",
  "invoices.controller.ts:getInvoice,mintInvoicePdfUrl",
  "receipts.controller.ts:getReceipt,mintReceiptPdfUrl",
  "webhooks.controller.ts:stripeWebhook",
  "licences.controller.ts:listLicences,getLicence,validateLicence,activateLicence",
  "storage.controller.ts:mintSignedUrl",
  "releases.controller.ts:listReleases,listDownloads,mintDownloadUrl",
  "bookings.controller.ts:createBooking,trackBooking",
  "admin.controller.ts:adminListBookings,adminPatchBooking"
)

foreach ($item in $stubControllers) {
  $parts = $item.Split(":")
  $file = $parts[0]
  $fns = $parts[1].Split(",")
  $lines = @()
  $lines += 'import type { Request, Response } from "express";'
  $lines += 'import { notImplemented } from "./_common.controller";'
  $lines += ""
  foreach ($fn in $fns) {
    $lines += "export function $fn(req: Request, res: Response) { return notImplemented(req, res); }"
  }
  ($lines -join "`r`n") | Set-Content -Encoding UTF8 (Join-Path $controllersDir $file)
}

# -----------------------------
# 4) Routes: match API_CONTRACTS_LOCK_v1.md paths
# -----------------------------
$routesDir = Join-Path $Backend "src/routes"
if (-not (Test-Path $routesDir)) { New-Item -ItemType Directory -Path $routesDir | Out-Null }

@'
import { Router } from "express";
import * as c from "../controllers/auth.controller";

export const authRoutes = Router();
authRoutes.post("/register", c.register);
authRoutes.post("/login", c.login);
authRoutes.post("/logout", c.logout);
authRoutes.get("/me", c.me);
authRoutes.post("/verify-email", c.verifyEmail);
authRoutes.post("/request-password-reset", c.requestPasswordReset);
authRoutes.post("/reset-password", c.resetPassword);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "auth.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/checkout.controller";
export const checkoutRoutes = Router();
checkoutRoutes.post("/start", c.checkoutStart);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "checkout.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/orders.controller";
export const ordersRoutes = Router();
ordersRoutes.get("/", c.listOrders);
ordersRoutes.get("/:ordId", c.getOrder);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "orders.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/invoices.controller";
export const invoicesRoutes = Router();
invoicesRoutes.get("/:invNumber", c.getInvoice);
invoicesRoutes.post("/:invNumber/pdf", c.mintInvoicePdfUrl);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "invoices.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/receipts.controller";
export const receiptsRoutes = Router();
receiptsRoutes.get("/:rcpNumber", c.getReceipt);
receiptsRoutes.post("/:rcpNumber/pdf", c.mintReceiptPdfUrl);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "receipts.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/webhooks.controller";
export const webhooksRoutes = Router();
webhooksRoutes.post("/stripe", c.stripeWebhook);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "webhooks.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/licences.controller";
export const licencesRoutes = Router();
licencesRoutes.get("/", c.listLicences);
licencesRoutes.get("/:licKey", c.getLicence);
licencesRoutes.post("/validate", c.validateLicence);
licencesRoutes.post("/activate", c.activateLicence);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "licences.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/storage.controller";
export const storageRoutes = Router();
storageRoutes.post("/signed-url", c.mintSignedUrl);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "storage.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/releases.controller";
export const releasesRoutes = Router();
releasesRoutes.get("/", c.listReleases);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "releases.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/releases.controller";
export const accountRoutes = Router();
accountRoutes.get("/downloads", c.listDownloads);
accountRoutes.post("/downloads/:releaseId/signed-url", c.mintDownloadUrl);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "account.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/bookings.controller";
export const bookingsRoutes = Router();
bookingsRoutes.post("/", c.createBooking);
bookingsRoutes.get("/track", c.trackBooking);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "bookings.routes.ts")

@'
import { Router } from "express";
import * as c from "../controllers/admin.controller";
import { requireRole } from "../middlewares/auth";
export const adminRoutes = Router();
adminRoutes.get("/bookings", requireRole("ADMIN"), c.adminListBookings);
adminRoutes.patch("/bookings/:bkgRef", requireRole("ADMIN"), c.adminPatchBooking);
'@ | Set-Content -Encoding UTF8 (Join-Path $routesDir "admin.routes.ts")

# -----------------------------
# 5) Update app.ts to mount webhook raw-body correctly (router mounted under /api/webhooks)
# -----------------------------
$appPath = Join-Path $Backend "src/app.ts"

@'
import express from "express";
import cookieParser from "cookie-parser";
import { loadEnv } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { tenantStub } from "./middlewares/tenant";
import { authStub } from "./middlewares/auth";
import { rawBody } from "./middlewares/raw-body";

import { authRoutes } from "./routes/auth.routes";
import { checkoutRoutes } from "./routes/checkout.routes";
import { ordersRoutes } from "./routes/orders.routes";
import { invoicesRoutes } from "./routes/invoices.routes";
import { receiptsRoutes } from "./routes/receipts.routes";
import { webhooksRoutes } from "./routes/webhooks.routes";
import { licencesRoutes } from "./routes/licences.routes";
import { storageRoutes } from "./routes/storage.routes";
import { releasesRoutes } from "./routes/releases.routes";
import { accountRoutes } from "./routes/account.routes";
import { bookingsRoutes } from "./routes/bookings.routes";
import { adminRoutes } from "./routes/admin.routes";

export function buildApp() {
  const env = loadEnv();
  const app = express();

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Tenant capture stub
  app.use("/api", tenantStub);

  // Stripe webhook MUST read raw body before JSON parsing
  app.use("/api/webhooks", rawBody, webhooksRoutes);

  // JSON parser for everything else
  app.use(express.json({ limit: "1mb" }));

  app.use(cookieParser(env.SESSION_SECRET));
  app.use("/api", authStub);

  app.use("/api/auth", authRoutes);
  app.use("/api/checkout", checkoutRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/receipts", receiptsRoutes);
  app.use("/api/licences", licencesRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/releases", releasesRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);
  return app;
}
'@ | Set-Content -Encoding UTF8 $appPath

Write-Host "`nDONE: Phase B.2 applied successfully." -ForegroundColor Green
Write-Host "Next: npm run dev + curl checks." -ForegroundColor Yellow
