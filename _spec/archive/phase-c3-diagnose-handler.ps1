# ============================================================
# Diagnose which handler is undefined in backend/src/app.ts
# Adds assertHandler(...) checks (idempotent).
# ============================================================
$ErrorActionPreference = "Stop"

$path = ".\backend\src\app.ts"
if (-not (Test-Path $path)) { throw "Missing file: $path" }

$app = Get-Content -Raw $path

# If the helper already exists, do not duplicate it
if ($app -notmatch "function assertHandler") {
  $insert = @'
  // --- DIAGNOSTICS: ensure every mounted handler is a function ---
  function assertHandler(name: string, h: any) {
    if (typeof h !== "function") {
      throw new Error(`[app.ts] Handler not a function: ${name} (type=${typeof h})`);
    }
  }

  // Assert known handlers mounted below
  assertHandler("resolveTenant", resolveTenant);
  assertHandler("rawBody", rawBody);
  assertHandler("webhooksRoutes", webhooksRoutes);

  assertHandler("authRoutes", authRoutes);
  assertHandler("checkoutRoutes", checkoutRoutes);
  assertHandler("ordersRoutes", ordersRoutes);
  assertHandler("invoicesRoutes", invoicesRoutes);
  assertHandler("receiptsRoutes", receiptsRoutes);
  assertHandler("licencesRoutes", licencesRoutes);
  assertHandler("storageRoutes", storageRoutes);
  assertHandler("releasesRoutes", releasesRoutes);
  assertHandler("accountRoutes", accountRoutes);
  assertHandler("bookingsRoutes", bookingsRoutes);
  assertHandler("adminRoutes", adminRoutes);

  assertHandler("errorHandler", errorHandler);
  // --- END DIAGNOSTICS ---
'@

  $idx = $app.IndexOf("app.use(")
  if ($idx -lt 0) { throw "Could not find 'app.use(' in app.ts" }
  $app = $app.Substring(0, $idx) + $insert + "`r`n" + $app.Substring($idx)
  Set-Content -Encoding UTF8 $path $app
  Write-Host "OK: Diagnostics injected into app.ts" -ForegroundColor Green
} else {
  Write-Host "Diagnostics already present in app.ts" -ForegroundColor Yellow
}
