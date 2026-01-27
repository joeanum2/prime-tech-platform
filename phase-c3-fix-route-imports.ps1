# ============================================================
# Phase C.3 Repair — Fix route import/export mismatches in app.ts
# Detects whether each routes file uses default export or named export,
# then patches backend/src/app.ts import lines accordingly.
# ============================================================
$ErrorActionPreference = "Stop"

$AppPath = ".\backend\src\app.ts"
if (-not (Test-Path $AppPath)) { throw "Missing: $AppPath" }

$routes = @(
  @{ name="authRoutes";     file=".\backend\src\routes\auth.routes.ts";     importPath="./routes/auth.routes" }
  @{ name="checkoutRoutes"; file=".\backend\src\routes\checkout.routes.ts"; importPath="./routes/checkout.routes" }
  @{ name="ordersRoutes";   file=".\backend\src\routes\orders.routes.ts";   importPath="./routes/orders.routes" }
  @{ name="invoicesRoutes"; file=".\backend\src\routes\invoices.routes.ts"; importPath="./routes/invoices.routes" }
  @{ name="receiptsRoutes"; file=".\backend\src\routes\receipts.routes.ts"; importPath="./routes/receipts.routes" }
  @{ name="licencesRoutes"; file=".\backend\src\routes\licences.routes.ts"; importPath="./routes/licences.routes" }
  @{ name="storageRoutes";  file=".\backend\src\routes\storage.routes.ts";  importPath="./routes/storage.routes" }
  @{ name="releasesRoutes"; file=".\backend\src\routes\releases.routes.ts"; importPath="./routes/releases.routes" }
  @{ name="accountRoutes";  file=".\backend\src\routes\account.routes.ts";  importPath="./routes/account.routes" }
  @{ name="bookingsRoutes"; file=".\backend\src\routes\bookings.routes.ts"; importPath="./routes/bookings.routes" }
  @{ name="adminRoutes";    file=".\backend\src\routes\admin.routes.ts";    importPath="./routes/admin.routes" }
  @{ name="webhooksRoutes"; file=".\backend\src\routes\webhooks.routes.ts"; importPath="./routes/webhooks.routes" }
)

function Get-ExportStyle($content, $exportName) {
  # Returns: "default" | "named" | "unknown"
  if ($content -match 'export\s+default\s+') { return "default" }
  if ($content -match ("export\s+(const|function)\s+" + [regex]::Escape($exportName) + "\b")) { return "named" }
  # common pattern: const router ... export default router
  if ($content -match 'export\s+default\s+router\b') { return "default" }
  return "unknown"
}

$app = Get-Content -Raw $AppPath

foreach ($r in $routes) {
  $name = $r.name
  $file = $r.file
  $importPath = $r.importPath

  if (-not (Test-Path $file)) {
    Write-Host "WARN: Missing routes file: $file (skipping)" -ForegroundColor Yellow
    continue
  }

  $content = Get-Content -Raw $file
  $style = Get-ExportStyle $content $name

  # Remove any existing import lines for this module/name (both default and named)
  $app = [regex]::Replace(
    $app,
    "^\s*import\s+\{\s*" + [regex]::Escape($name) + "\s*\}\s+from\s+`"" + [regex]::Escape($importPath) + "`";\s*\r?\n",
    "",
    "Multiline"
  )
  $app = [regex]::Replace(
    $app,
    "^\s*import\s+" + [regex]::Escape($name) + "\s+from\s+`"" + [regex]::Escape($importPath) + "`";\s*\r?\n",
    "",
    "Multiline"
  )

  # Insert the correct import near the top (after last import statement block)
  $lines = $app -split "`r?`n"
  $lastImportIdx = -1
  for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match '^\s*import\s+') { $lastImportIdx = $i }
  }

  $importLine = $null
  if ($style -eq "default") {
    $importLine = "import $name from `"$importPath`";"
  } elseif ($style -eq "named") {
    $importLine = "import { $name } from `"$importPath`";"
  } else {
    # If unknown, do NOT guess; leave it out and we will catch it by a clear error.
    Write-Host "WARN: Could not determine export style for $name in $file (leaving import out)" -ForegroundColor Yellow
    continue
  }

  if ($lastImportIdx -ge 0) {
    $newLines = @()
    $newLines += $lines[0..$lastImportIdx]
    $newLines += $importLine
    if ($lastImportIdx+1 -le $lines.Length-1) { $newLines += $lines[($lastImportIdx+1)..($lines.Length-1)] }
    $app = ($newLines -join "`r`n")
  } else {
    $app = $importLine + "`r`n" + $app
  }

  Write-Host ("OK: " + $name + " -> " + $style) -ForegroundColor Green
}

Set-Content -Encoding UTF8 $AppPath $app
Write-Host "DONE: Patched backend/src/app.ts imports to match route exports." -ForegroundColor Cyan
