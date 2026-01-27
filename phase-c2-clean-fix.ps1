# Phase C.2 CLEAN FIX (schema-aligned): Tenant.key + TenantDomain.domain
# Fixes:
# - tenant middleware export/import
# - app.ts mounting under /api
# - seed script fields
# - package.json db:seed (writes without BOM)

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"
if (-not (Test-Path $Backend)) { throw "Run from repo root; backend/ not found." }

function Ensure-Dir($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

Ensure-Dir (Join-Path $Backend "src\middlewares")
Ensure-Dir (Join-Path $Backend "prisma")

$tenantTs = Join-Path $Backend "src\middlewares\tenant.ts"
$appTs    = Join-Path $Backend "src\app.ts"
$seedTs   = Join-Path $Backend "prisma\seed.ts"
$pkgJson  = Join-Path $Backend "package.json"

# 1) Write tenant middleware (named export resolveTenant; domain/key)
@'
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma";

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const raw = (req.headers["x-forwarded-host"] || req.headers["host"] || "").toString();
  const domain = raw.split(":")[0].trim().toLowerCase();

  if (!domain) {
    return res.status(400).json({ error: "Missing Host header" });
  }

  const rec = await prisma.tenantDomain.findUnique({
    where: { domain },
    select: { tenantId: true, tenant: { select: { key: true } } }
  });

  if (!rec) {
    return res.status(404).json({ error: "Tenant not found", domain });
  }

  (req as any).tenantId = rec.tenantId;
  (req as any).tenantKey = rec.tenant.key;
  return next();
}
'@ | Set-Content -Encoding UTF8 $tenantTs

# 2) Write seed (Tenant.key + TenantDomain.domain)
@'
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

  console.log("Seeded tenant:", tenant.key);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
'@ | Set-Content -Encoding UTF8 $seedTs

# 3) Ensure package.json has db:seed and write WITHOUT BOM
$pkgRaw = Get-Content -Raw $pkgJson
$pkg = $pkgRaw | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkg.scripts."db:seed" = "ts-node prisma/seed.ts"
$pkgOut = $pkg | ConvertTo-Json -Depth 50
[System.IO.File]::WriteAllText((Resolve-Path $pkgJson), $pkgOut, (New-Object System.Text.UTF8Encoding($false)))

# 4) Patch app.ts to import + mount resolveTenant under /api (and remove tenantStub use)
if (-not (Test-Path $appTs)) { throw "Missing backend/src/app.ts" }
$app = Get-Content -Raw $appTs

# Remove known-bad imports/usages if present
$app = $app -replace 'import\s+\{\s*tenantStub\s*\}\s+from\s+"\./middlewares/tenant";\s*', ''
$app = $app -replace 'import\s+tenantStub\s+from\s+"\./middlewares/tenant";\s*', ''
$app = $app -replace 'app\.use\("\/api",\s*tenantStub\);\s*', ''

# Ensure correct import exists near top
if ($app -notmatch 'import\s+\{\s*resolveTenant\s*\}\s+from\s+"\./middlewares/tenant";') {
  $app = 'import { resolveTenant } from "./middlewares/tenant";' + "`r`n" + $app
}

# Ensure middleware mounted once
if ($app -notmatch 'app\.use\("\/api",\s*resolveTenant\);') {
  $needle = 'app.get("/api/health"'
  $idx = $app.IndexOf($needle)
  if ($idx -ge 0) {
    $end = $app.IndexOf(');', $idx)
    if ($end -lt 0) { throw "Could not find end of /api/health statement in app.ts" }
    $end += 2
    $ins = "`r`napp.use(""/api"", resolveTenant);`r`n"
    $app = $app.Substring(0, $end) + $ins + $app.Substring($end)
  } else {
    # fallback: after app creation
    $app = $app -replace '(const\s+app\s*=\s*express\(\);\s*)', '$1' + "`r`n" + 'app.use("/api", resolveTenant);' + "`r`n"
  }
}

Set-Content -Encoding UTF8 $appTs $app

Write-Host "OK: Phase C.2 clean fix applied (tenant middleware, app mount, seed, db:seed, no BOM)." -ForegroundColor Green
