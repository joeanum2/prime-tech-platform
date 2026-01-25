# Prime Tech Platform - repo bootstrap (PowerShell)
# Run this from: C:\Users\joean\Documents\prime-tech-platform

$ErrorActionPreference = "Stop"

Write-Host "Initializing git repository (if not already initialized)..."
if (-not (Test-Path ".git")) { git init | Out-Null }

Write-Host "Creating required folders..."
$folders = @("_spec","backend","frontend","docs","docker")
foreach ($f in $folders) {
  if (-not (Test-Path $f)) { New-Item -ItemType Directory -Path $f | Out-Null }
}

Write-Host "Copy the following files into _spec:"
Write-Host " - CODEX_HANDOFF_v1.md (your backend authoritative spec)"
Write-Host " - FRONTEND_HANDOFF_v1.pdf (frontend spec)"
Write-Host " - CODEX_EXECUTION_PLAN_v1.md (included in this zip)"

Write-Host "Done."
