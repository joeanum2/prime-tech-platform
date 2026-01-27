# Phase C.2 Repair — PowerShell 5 SAFE VERSION (no special chars, no escaped quotes)
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run from repo root (backend folder not found)." }

Write-Host "Fixing Phase C.2..." -ForegroundColor Cyan

# Ensure dirs
if (-not (Test-Path (Join-Path $Backend "src\middlewares"))) { New-Item -ItemType Directory -Path (Join-Path $Backend "src\middlewares") | Out-Null }
if (-not (Test-Path (Join-Path $Backend "prisma"))) { New-Item -ItemType Directory -Path (Join-Path $Backend "prisma") | Out-Null }

# 1) tenant middleware
$tenantPath = Join-Path $Backend "src\middlewares\tenant.ts"
@'
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const host = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString();
  const hostname = host.split(":")[0].trim().toLowerCase();

  if (!hostname) {
    return res.status(400).json({ error: "Missing host" });
  }

  const domain = await prisma.tenantDomain.findUnique({
    where: { hostname },
    select: { tenantId: true, tenant: { select: { slug: true } } }
  });

  if (!domain) {
    return res.status(404).json({ error: "Tenant not found" });
  }

  (req as any).tenantId = domain.tenantId;
  (req as any).tenantSlug = domain.tenant.slug;
  return next();
}
'@ | Set-Content -Encoding UTF8 $tenantPath
Write-Host "OK: tenant middleware written" -ForegroundColor Green

# 2) prisma seed
$seedPath = Join-Path $Backend "prisma\seed.ts"
@'
import { prisma } from "../src/db/prisma";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "primetech" },
    update: {},
    create: { name: "Prime Tech Services", slug: "primetech" },
    select: { id: true, slug: true }
  });

  for (const host of ["localhost", "127.0.0.1"]) {
    await prisma.tenantDomain.upsert({
      where: { hostname: host },
      update: { tenantId: tenant.id },
      create: { hostname: host, tenantId: tenant.id }
    });
  }

  console.log("Seeded tenant:", tenant.slug);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
'@ | Set-Content -Encoding UTF8 $seedPath
Write-Host "OK: prisma seed written" -ForegroundColor Green

# 3) add db:seed to backend/package.json
$pkgPath = Join-Path $Backend "package.json"
$pkg = Get-Content -Raw $pkgPath | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkg.scripts | Add-Member -MemberType NoteProperty -Name "db:seed" -Value "ts-node prisma/seed.ts" -Force
$pkg | ConvertTo-Json -Depth 50 | Set-Content -Encoding UTF8 $pkgPath
Write-Host "OK: db:seed added to package.json" -ForegroundColor Green

# 4) patch app.ts (insert import + middleware use)
$appPath = Join-Path $Backend "src\app.ts"
$app = Get-Content -Raw $appPath

if ($app -notmatch 'resolveTenant') {
  # ensure import line exists
  if ($app -notmatch 'from "\.\/middlewares\/tenant"') {
    $app = $app -replace 'import\s+\{\s*errorHandler\s*\}\s+from\s+"\.\/middlewares\/error-handler";',
      'import { errorHandler } from "./middlewares/error-handler";' + "`r`n" + 'import { resolveTenant } from "./middlewares/tenant";'
  }

  # insert middleware usage after the health route definition (first occurrence)
  $needle = 'app.get("/api/health"'
  $idx = $app.IndexOf($needle)
  if ($idx -lt 0) { throw "Could not find /api/health route in src/app.ts to anchor middleware insertion." }

  # find end of that line's statement by locating the next ');'
  $end = $app.IndexOf(');', $idx)
  if ($end -lt 0) { throw "Could not locate end of /api/health route statement in src/app.ts." }
  $end = $end + 2

  $insert = "`r`napp.use('/api', resolveTenant);`r`n"
  $app = $app.Substring(0, $end) + $insert + $app.Substring($end)
}

Set-Content -Encoding UTF8 $appPath $app
Write-Host "OK: app.ts patched" -ForegroundColor Green

Write-Host ""
Write-Host "Phase C.2 repair complete." -ForegroundColor Cyan
Write-Host "Next:"
Write-Host "  cd backend"
Write-Host "  npm run db:seed"
Write-Host "  npm run dev"
