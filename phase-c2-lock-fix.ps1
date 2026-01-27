# ============================================================
# Phase C.2 LOCK FIX — Schema-aligned (Tenant.key + TenantDomain.domain)
# - Fix tenant middleware to resolve tenant by domain
# - Fix seed to create Tenant(key) + TenantDomain(domain)
# - Ensure app.ts imports + mounts resolveTenant correctly
# - Ensure package.json has db:seed
# PowerShell 5 safe (no special unicode, no escaped quote traps)
# ============================================================

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run from repo root; backend/ not found." }

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

Ensure-Dir (Join-Path $Backend "src\middlewares")
Ensure-Dir (Join-Path $Backend "prisma")

Write-Host "Phase C.2 LOCK FIX starting..." -ForegroundColor Cyan

# ------------------------------------------------------------
# 1) Tenant middleware (query TenantDomain.domain)
# ------------------------------------------------------------
$tenantPath = Join-Path $Backend "src\middlewares\tenant.ts"
@'
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

/**
 * Resolves tenant from Host / X-Forwarded-Host using TenantDomain.domain
 * Attaches:
 *   (req as any).tenantId
 *   (req as any).tenantKey
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const raw = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString();
  const domain = raw.split(":")[0].trim().toLowerCase();

  if (!domain) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Missing Host header.", details: { fieldErrors: {}, meta: {} } }
    });
  }

  const rec = await prisma.tenantDomain.findUnique({
    where: { domain },
    select: { tenantId: true, tenant: { select: { key: true } } }
  });

  if (!rec) {
    return res.status(404).json({
      error: { code: "TENANT_NOT_FOUND", message: "Tenant not found for domain.", details: { fieldErrors: {}, meta: { domain } } }
    });
  }

  (req as any).tenantId = rec.tenantId;
  (req as any).tenantKey = rec.tenant.key;
  return next();
}
'@ | Set-Content -Encoding UTF8 $tenantPath
Write-Host "OK: wrote src/middlewares/tenant.ts" -ForegroundColor Green

# ------------------------------------------------------------
# 2) Seed (Tenant.key + TenantDomain.domain)
# ------------------------------------------------------------
$seedPath = Join-Path $Backend "prisma\seed.ts"
@'
import { prisma } from "../src/db/prisma";

async function main() {
  // IMPORTANT: matches schema.prisma (Tenant.key, TenantDomain.domain)
  const tenant = await prisma.tenant.upsert({
    where: { key: "primetech" },
    update: { name: "Prime Tech Services", status: "ACTIVE" },
    create: { key: "primetech", name: "Prime Tech Services", status: "ACTIVE" },
    select: { id: true, key: true, name: true }
  });

  const domains = ["localhost", "127.0.0.1"];

  for (const d of domains) {
    await prisma.tenantDomain.upsert({
      where: { domain: d },
      update: { tenantId: tenant.id, isPrimary: d === "localhost" },
      create: { domain: d, tenantId: tenant.id, isPrimary: d === "localhost" }
    });
  }

  console.log("Seeded tenant:", tenant.key);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
'@ | Set-Content -Encoding UTF8 $seedPath
Write-Host "OK: wrote prisma/seed.ts" -ForegroundColor Green

# ------------------------------------------------------------
# 3) Ensure backend/package.json has db:seed (avoid BOM)
# ------------------------------------------------------------
$pkgPath = Join-Path $Backend "package.json"
$pkgRaw = Get-Content -Raw $pkgPath
# Write back as UTF-8 without BOM by re-serializing JSON via ConvertFrom-Json/To-Json
$pkg = $pkgRaw | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkg.scripts."db:seed" = "ts-node prisma/seed.ts"
$pkgJson = $pkg | ConvertTo-Json -Depth 50
# Ensure NO BOM
[System.IO.File]::WriteAllText((Resolve-Path $pkgPath), $pkgJson, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "OK: ensured db:seed in backend/package.json (no BOM)" -ForegroundColor Green

# ------------------------------------------------------------
# 4) Patch src/app.ts to import + mount resolveTenant
# ------------------------------------------------------------
$appPath = Join-Path $Backend "src\app.ts"
if (-not (Test-Path $appPath)) { throw "backend/src/app.ts not found." }

$app = Get-Content -Raw $appPath

# Ensure import exists
if ($app -notmatch 'import\s+\{\s*resolveTenant\s*\}\s+from\s+"\./middlewares/tenant";') {
  # Insert after error-handler import if present, else after first import block
  if ($app -match 'import\s+\{\s*errorHandler\s*\}\s+from\s+"\./middlewares/error-handler";') {
    $app = $app -replace 'import\s+\{\s*errorHandler\s*\}\s+from\s+"\./middlewares/error-handler";',
      'import { errorHandler } from "./middlewares/error-handler";' + "`r`n" +
      'import { resolveTenant } from "./middlewares/tenant";'
  } else {
    $app = 'import { resolveTenant } from "./middlewares/tenant";' + "`r`n" + $app
  }
}

# Ensure mounted once
if ($app -notmatch 'app\.use\("\/api",\s*resolveTenant\);') {
  # Insert right after /api/health if present, else after app creation
  $needle = 'app.get("/api/health"'
  $idx = $app.IndexOf($needle)
  if ($idx -ge 0) {
    $end = $app.IndexOf(');', $idx)
    if ($end -lt 0) { throw "Could not locate end of /api/health statement in app.ts." }
    $end = $end + 2
    $insert = "`r`napp.use(""/api"", resolveTenant);`r`n"
    $app = $app.Substring(0, $end) + $insert + $app.Substring($end)
  } else {
    $app = $app -replace '(const\s+app\s*=\s*express\(\);\s*)', '$1' + "`r`n" + 'app.use("/api", resolveTenant);' + "`r`n"
  }
}

Set-Content -Encoding UTF8 $appPath $app
Write-Host "OK: patched src/app.ts (import + mount)" -ForegroundColor Green

Write-Host ""
Write-Host "Phase C.2 LOCK FIX applied." -ForegroundColor Cyan
Write-Host "Next commands:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor Yellow
Write-Host "  npm run db:seed" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Yellow
