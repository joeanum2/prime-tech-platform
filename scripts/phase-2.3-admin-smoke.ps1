$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$logPath = Join-Path $PSScriptRoot "phase-2.3-admin-smoke.log"

function Log($message) {
  $ts = (Get-Date).ToString("s")
  Add-Content -Path $logPath -Value ("[$ts] " + $message)
}

Log "Phase 2.3 smoke start"

$backendDir = Join-Path $repoRoot "backend"
$nodeModules = Join-Path $backendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
  Log "node_modules missing; running npm ci"
  Push-Location $backendDir
  try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  } finally {
    Pop-Location
  }
} else {
  Log "node_modules present; skipping npm ci"
}

$listening = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Log "Port 4000 free; starting npm run dev"
  $cmd = "Set-Location -Path `"$backendDir`"; npm run dev"
  Start-Process -FilePath "powershell" -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd) | Out-Null

  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $health = & curl.exe -s "http://127.0.0.1:4000/api/health"
  } while ((Get-Date) -lt $deadline -and $health -notmatch '"ok"\s*:\s*true')

  if ($health -notmatch '"ok"\s*:\s*true') {
    Log "Health check failed to become ready"
    throw "Dev server did not become ready"
  }

  Log "Dev server ready"
} else {
  Log "Port 4000 already listening; not starting dev server"
}

Log "Running admin smoke"
$smokeScript = Join-Path $PSScriptRoot "smoke-admin.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $smokeScript
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Log "Admin smoke failed with exit code $exitCode"
  exit $exitCode
}

Log "Admin smoke passed"
Log "Phase 2.3 smoke complete"
