# ============================================================
# Phase D.3 — Finalise Platform (Read endpoints + Admin reconcile)
# Codex-only, deterministic, ASCII-safe
# Run from repo root
# ============================================================
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run from repo root. backend/ not found." }

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }
function Write-File($path, $content) {
  $dir = Split-Path $path -Parent
  Ensure-Dir $dir
  $content | Set-Content -Encoding UTF8 $path
}

Write-Host "Phase D.3 starting..."

# ------------------------------------------------------------
# A) New controllers (do NOT touch existing controllers)
# ------------------------------------------------------------
$acctCtrl = @'
import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middlewares/auth";

/**
 * GET /api/account/orders
 * Requires auth. Returns orders for current user, scoped to tenant.
 */
export async function listMyOrders(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const orders = await prisma.order.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      invoice: true,
      receipt: true,
      payment: true,
      items: true
    }
  });

  return res.json({ orders });
}

/**
 * GET /api/account/entitlements
 * Requires auth. Returns entitlements for current user, scoped to tenant.
 */
export async function listMyEntitlements(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const entitlements = await prisma.entitlement.findMany({
    where: { tenantId: user.tenantId, userId: user.id },
    orderBy: { grantedAt: "desc" },
    include: { }
  });

  return res.json({ entitlements });
}
'@

Write-File (Join-Path $Backend "src/controllers/account.read.controller.ts") $acctCtrl

$adminCtrl = @'
import { Request, Response } from "express";
import { prisma } from "../db/prisma";

/**
 * Admin reconciliation endpoints.
 * All must be protected by requireRole("ADMIN") in routes.
 * Tenant scoping is enforced by tenantId from req.user.
 */
function mustAdmin(req: Request) {
  const user = (req as any).user;
  if (!user) return { ok: false as const, status: 401, error: "Not authenticated" };
  if (user.role !== "ADMIN") return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, user };
}

export async function adminHealth(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  return res.json({ ok: true, tenantId: a.user.tenantId });
}

export async function adminListOrders(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const orders = await prisma.order.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { items: true, invoice: true, receipt: true, payment: true }
  });

  return res.json({ orders });
}

export async function adminListInvoices(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const invoices = await prisma.invoice.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ invoices });
}

export async function adminListReceipts(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const receipts = await prisma.receipt.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ receipts });
}

export async function adminListPayments(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const payments = await prisma.payment.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ payments });
}

export async function adminListWebhookEvents(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const webhookEvents = await prisma.webhookEvent.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({ webhookEvents });
}

export async function adminListEntitlements(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const entitlements = await prisma.entitlement.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { grantedAt: "desc" }
  });

  return res.json({ entitlements });
}

export async function adminListLicences(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const licences = await prisma.licence.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { createdAt: "desc" },
    include: { activation: true }
  });

  return res.json({ licences });
}

export async function adminListActivations(req: Request, res: Response) {
  const a = mustAdmin(req);
  if (!a.ok) return res.status(a.status).json({ error: a.error });

  const activations = await prisma.activation.findMany({
    where: { tenantId: a.user.tenantId },
    orderBy: { activatedAt: "desc" }
  });

  return res.json({ activations });
}
'@

Write-File (Join-Path $Backend "src/controllers/admin.reconcile.controller.ts") $adminCtrl

# ------------------------------------------------------------
# B) Patch routes to mount new endpoints
#    - Patch account.routes.ts and admin.routes.ts ONLY
# ------------------------------------------------------------

# --- account.routes.ts patch ---
$accountRoutesPath = Join-Path $Backend "src/routes/account.routes.ts"
if (-not (Test-Path $accountRoutesPath)) { throw "Missing: $accountRoutesPath" }
$accountText = Get-Content -Raw $accountRoutesPath

# Ensure imports exist
if ($accountText -notmatch 'account\.read\.controller') {
  # Add imports after first express import line
  $accountText = $accountText -replace '(?m)^import\s+\{\s*Router\s*\}\s+from\s+"express";\s*$', ('$0' + "`r`n" +
    'import { requireAuth } from "../middlewares/auth";' + "`r`n" +
    'import * as ar from "../controllers/account.read.controller";')
}

# Ensure routes exist (append if missing)
if ($accountText -notmatch '(?m)accountRoutes\.get\("\/orders"') {
  $accountText += "`r`n" + 'accountRoutes.get("/orders", requireAuth, ar.listMyOrders);' + "`r`n"
}
if ($accountText -notmatch '(?m)accountRoutes\.get\("\/entitlements"') {
  $accountText += 'accountRoutes.get("/entitlements", requireAuth, ar.listMyEntitlements);' + "`r`n"
}

Set-Content -Encoding UTF8 $accountRoutesPath $accountText

# --- admin.routes.ts patch ---
$adminRoutesPath = Join-Path $Backend "src/routes/admin.routes.ts"
if (-not (Test-Path $adminRoutesPath)) { throw "Missing: $adminRoutesPath" }
$adminText = Get-Content -Raw $adminRoutesPath

if ($adminText -notmatch 'admin\.reconcile\.controller') {
  $adminText = $adminText -replace '(?m)^import\s+\*\s+as\s+c\s+from\s+"\.\.\/controllers\/admin\.controller";\s*$', ('$0' + "`r`n" +
    'import * as r from "../controllers/admin.reconcile.controller";')
}

# Add endpoints if missing
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/health"') {
  $adminText += "`r`n" + 'adminRoutes.get("/health", requireRole("ADMIN"), r.adminHealth);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/orders"') {
  $adminText += 'adminRoutes.get("/orders", requireRole("ADMIN"), r.adminListOrders);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/invoices"') {
  $adminText += 'adminRoutes.get("/invoices", requireRole("ADMIN"), r.adminListInvoices);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/receipts"') {
  $adminText += 'adminRoutes.get("/receipts", requireRole("ADMIN"), r.adminListReceipts);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/payments"') {
  $adminText += 'adminRoutes.get("/payments", requireRole("ADMIN"), r.adminListPayments);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/webhook-events"') {
  $adminText += 'adminRoutes.get("/webhook-events", requireRole("ADMIN"), r.adminListWebhookEvents);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/entitlements"') {
  $adminText += 'adminRoutes.get("/entitlements", requireRole("ADMIN"), r.adminListEntitlements);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/licences"') {
  $adminText += 'adminRoutes.get("/licences", requireRole("ADMIN"), r.adminListLicences);' + "`r`n"
}
if ($adminText -notmatch '(?m)adminRoutes\.get\("\/activations"') {
  $adminText += 'adminRoutes.get("/activations", requireRole("ADMIN"), r.adminListActivations);' + "`r`n"
}

Set-Content -Encoding UTF8 $adminRoutesPath $adminText

# ------------------------------------------------------------
# C) Write a smoke test script (optional but recommended)
# ------------------------------------------------------------
$smoke = @'
# Phase D.3 smoke tests (run in a second terminal while npm run dev is running)
# Health
curl http://127.0.0.1:4000/api/health

# Admin health will require auth cookie as ADMIN:
# curl http://127.0.0.1:4000/api/admin/health

# Account endpoints require auth cookie:
# curl http://127.0.0.1:4000/api/account/orders
# curl http://127.0.0.1:4000/api/account/entitlements
'@
Write-File (Join-Path $Root "phase-d3-smoke.txt") $smoke

Write-Host "Phase D.3 applied."
Write-Host "Next: cd backend; npm run dev"
Write-Host "Then run: curl http://127.0.0.1:4000/api/health"
