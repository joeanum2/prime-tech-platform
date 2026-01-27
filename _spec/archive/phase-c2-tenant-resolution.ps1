# ============================================================
# Phase C.2 — Tenant Resolution & Request Context Wiring
# (Corrected: safe here-strings, safe app.ts patching)
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "== Phase C.2 :: Tenant Resolution ==" -ForegroundColor Cyan

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"

if (-not (Test-Path $Backend)) { throw "Run from repo root. backend/ not found." }

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

Ensure-Dir (Join-Path $Backend "src/middlewares")
Ensure-Dir (Join-Path $Backend "prisma")

# -------------------------------
# 1) Create REAL tenant resolver middleware
# -------------------------------
$tenantMiddleware = @'
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

/**
 * Resolve tenant from Host / X-Forwarded-Host.
 * Attaches:
 *   (req as any).tenantId
 *   (req as any).tenantSlug
 */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const hostHeader = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString();
  const hostname = hostHeader.split(":")[0].trim().toLowerCase();

  if (!hostname) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Missing Host header.", details: { fieldErrors: {}, meta: {} } }
    });
  }

  const domain = await prisma.tenantDomain.findUnique({
    where: { hostname },
    select: { tenantId: true, tenant: { select: { slug: true } } }
  });

  if (!domain) {
    return res.status(404).json({
      error: {
        code: "TENANT_NOT_FOUND",
        message: "Tenant not found for host.",
        details: { fieldErrors: {}, meta: { hostname } }
      }
    });
  }

  (req as any).tenantId = domain.tenantId;
  (req as any).tenantSlug = domain.tenant.slug;
  return next();
}
'@

$tenantPath = Join-Path $Backend "src/middlewares/tenant.ts"
Set-Content -Encoding UTF8 -Path $tenantPath -Value $tenantMiddleware
Write-Host "✓ Wrote src/middlewares/tenant.ts" -ForegroundColor Green

# -------------------------------
# 2) Patch app.ts deterministically
#   - replace tenantStub import/use with resolveTenant
# -------------------------------
$appPath = Join-Path $Backend "src/app.ts"
if (-not (Test-Path $appPath)) { throw "backend/src/app.ts not found." }

$app = Get-Content -Raw $appPath

# Replace import { tenantStub } ... with import { resolveTenant } ...
$app = $app -replace 'import\s+\{\s*tenantStub\s*\}\s+from\s+"\.\/middlewares\/tenant";', 'import { resolveTenant } from "./middlewares/tenant";'

# Replace app.use("/api", tenantStub); with app.use("/api", resolveTenant);
$app = $app -replace 'app\.use\("\/api",\s*tenantStub\);', 'app.use("/api", resolveTenant);'

# If tenantStub line not found (older variants), insert resolveTenant after /api/health
if ($app -notmatch 'resolveTenant') {
  # ensure import exists
  if ($app -notmatch 'from "\.\/middlewares\/tenant"') {
    $app = $app -replace 'import\s+\{\s*errorHandler\s*\}\s+from\s+"\.\/middlewares\/error-handler";',
      'import { errorHandler } from "./middlewares/error-handler";' + "`r`n" + 'import { resolveTenant } from "./middlewares/tenant";'
  }
  # insert middleware usage after health route
  $app = $app -replace 'app\.get\("\/api\/health",[^\)]*\);\s*',
    '$0' + "`r`n" + '  app.use("/api", resolveTenant);' + "`r`n"
}

Set-Content -Encoding UTF8 -Path $appPath -Value $app
Write-Host "✓ Patched src/app.ts to use resolveTenant" -ForegroundColor Green

# -------------------------------
# 3) Create prisma seed script (TypeScript)
# -------------------------------
$seedPath = Join-Path $Backend "prisma/seed.ts"
$seedTs = @'
import { prisma } from "../src/db/prisma";

async function main() {
  // Create a default tenant for local dev
  const tenant = await prisma.tenant.upsert({
    where: { slug: "primetech" },
    update: {},
    create: {
      name: "Prime Tech Services",
      slug: "primetech",
    },
    select: { id: true, slug: true }
  });

  // Ensure hostnames resolve to this tenant in dev
  const hostnames = ["localhost", "127.0.0.1"];
  for (const hostname of hostnames) {
    await prisma.tenantDomain.upsert({
      where: { hostname },
      update: { tenantId: tenant.id },
      create: { hostname, tenantId: tenant.id }
    });
  }

  console.log("Seeded tenant:", tenant.slug);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
'@
Set-Content -Encoding UTF8 -Path $seedPath -Value $seedTs
Write-Host "✓ Wrote prisma/seed.ts" -ForegroundColor Green

# -------------------------------
# 4) Add db:seed to backend/package.json
# -------------------------------
$pkgPath = Join-Path $Backend "package.json"
$pkgJson = Get-Content -Raw $pkgPath | ConvertFrom-Json

if (-not $pkgJson.scripts) { $pkgJson | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkgJson.scripts | Add-Member -MemberType NoteProperty -Name "db:seed" -Value "ts-node prisma/seed.ts" -Force

$pkgJson | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $pkgPath
Write-Host "✓ Added npm script db:seed" -ForegroundColor Green

Write-Host ""
Write-Host "Phase C.2 files written." -ForegroundColor Green
Write-Host "Next commands:" -ForegroundColor Yellow
Write-Host "  cd backend" -ForegroundColor Yellow
Write-Host "  npm run db:seed" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor Yellow
