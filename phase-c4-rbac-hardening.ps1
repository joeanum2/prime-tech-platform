# ============================================================
# Phase C.4 — RBAC hardening (ADMIN/STAFF) + route guard sanity
# - Protect /api/admin with requireAuth + requireRole("ADMIN")
# - Protect /api/account with requireAuth (if not already)
# - Add minimal /api/admin/health route (guarded) if missing
# - No contract changes beyond guards
# ============================================================
$ErrorActionPreference = "Stop"

$AdminRoutes = ".\backend\src\routes\admin.routes.ts"
$AccountRoutes = ".\backend\src\routes\account.routes.ts"

function Ensure-File($p) { if (-not (Test-Path $p)) { throw "Missing file: $p" } }
function Save($p, $c) { Set-Content -Encoding UTF8 $p $c }

Ensure-File $AdminRoutes

# ----------------------------
# 1) Harden admin routes
# ----------------------------
$admin = Get-Content -Raw $AdminRoutes

# Ensure imports for requireAuth/requireRole exist
if ($admin -notmatch 'requireAuth' -or $admin -notmatch 'requireRole') {
  # Add/replace an auth import line safely
  if ($admin -match 'from\s+"../middlewares/auth";') {
    # If an auth import exists but missing symbols, replace it
    $admin = [regex]::Replace(
      $admin,
      'import\s+\{[^}]*\}\s+from\s+"../middlewares/auth";',
      'import { requireAuth, requireRole } from "../middlewares/auth";'
    )
  } else {
    # Insert after first import
    $admin = [regex]::Replace(
      $admin,
      '^(import[^\r\n]*\r?\n)',
      '$1import { requireAuth, requireRole } from "../middlewares/auth";' + "`r`n"
    )
  }
}

# Ensure router is guarded at the top-level
# Common patterns: router.use(requireAuth); router.use(requireRole("ADMIN"));
if ($admin -notmatch 'router\.use\(\s*requireAuth\s*\)') {
  $admin = [regex]::Replace($admin, '(const\s+router\s*=\s*Router\(\);\s*\r?\n)', '$1' + 'router.use(requireAuth);' + "`r`n")
}
if ($admin -notmatch 'router\.use\(\s*requireRole\(\s*"ADMIN"\s*\)\s*\)') {
  $admin = [regex]::Replace($admin, '(router\.use\(requireAuth\);\s*\r?\n)', '$1' + 'router.use(requireRole("ADMIN"));' + "`r`n")
}

# Add a guarded health route if none exists (non-breaking)
if ($admin -notmatch '\/health') {
  $admin = [regex]::Replace(
    $admin,
    '(router\.use\(requireRole\("ADMIN"\)\);\s*\r?\n)',
    '$1' + 'router.get("/health", (_req, res) => res.json({ ok: true }));' + "`r`n"
  )
}

Save $AdminRoutes $admin
Write-Host "OK: admin.routes.ts hardened (requireAuth + requireRole('ADMIN'))." -ForegroundColor Green

# ----------------------------
# 2) Ensure account routes requireAuth
# ----------------------------
if (Test-Path $AccountRoutes) {
  $acct = Get-Content -Raw $AccountRoutes

  # Ensure requireAuth import exists
  if ($acct -notmatch 'requireAuth') {
    if ($acct -match 'from\s+"../middlewares/auth";') {
      $acct = [regex]::Replace(
        $acct,
        'import\s+\{[^}]*\}\s+from\s+"../middlewares/auth";',
        'import { requireAuth } from "../middlewares/auth";'
      )
    } else {
      $acct = [regex]::Replace(
        $acct,
        '^(import[^\r\n]*\r?\n)',
        '$1import { requireAuth } from "../middlewares/auth";' + "`r`n"
      )
    }
  }

  # Apply router.use(requireAuth) if missing
  if ($acct -notmatch 'router\.use\(\s*requireAuth\s*\)') {
    $acct = [regex]::Replace($acct, '(const\s+router\s*=\s*Router\(\);\s*\r?\n)', '$1' + 'router.use(requireAuth);' + "`r`n")
  }

  Save $AccountRoutes $acct
  Write-Host "OK: account.routes.ts requires auth." -ForegroundColor Green
} else {
  Write-Host "WARN: account.routes.ts not found (skipped)." -ForegroundColor Yellow
}

Write-Host "`nDONE: Phase C.4 RBAC hardening applied." -ForegroundColor Cyan
Write-Host "Next: cd backend; npm run dev" -ForegroundColor Yellow
Write-Host "Then test: curl http://localhost:4000/api/admin/health (should be 401 until logged in)" -ForegroundColor Yellow
