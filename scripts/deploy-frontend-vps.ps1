[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Description,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host "==> $Description"
  & $Action
}

function Assert-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

$vpsHost = ($env:VPS_HOST ?? "").Trim()
if ([string]::IsNullOrWhiteSpace($vpsHost)) {
  Write-Error "VPS_HOST is required. Example: `$env:VPS_HOST='203.0.113.10'"
  exit 1
}

$vpsUser = ($env:VPS_USER ?? "root").Trim()
if ([string]::IsNullOrWhiteSpace($vpsUser)) {
  $vpsUser = "root"
}

$vpsFrontendDir = ($env:VPS_FRONTEND_DIR ?? "/opt/prime-tech-frontend").Trim()
if ([string]::IsNullOrWhiteSpace($vpsFrontendDir)) {
  $vpsFrontendDir = "/opt/prime-tech-frontend"
}

Assert-Command -Name npm
Assert-Command -Name ssh
Assert-Command -Name scp

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendDir = Join-Path $repoRoot "frontend"
if (-not (Test-Path $frontendDir)) {
  throw "Frontend directory not found at $frontendDir"
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$bundleName = "prime-tech-frontend-$timestamp.zip"
$bundlePath = Join-Path ([System.IO.Path]::GetTempPath()) $bundleName
$remoteTarget = "$vpsUser@$vpsHost"
$remoteBundlePath = "/tmp/$bundleName"

if (Test-Path $bundlePath) {
  Remove-Item -LiteralPath $bundlePath -Force
}

$prevLocation = Get-Location
try {
  Set-Location $frontendDir

  Invoke-Step -Description "Installing frontend dependencies (npm ci)" -Action {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
  }

  Invoke-Step -Description "Building frontend (npm run build)" -Action {
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
  }

  $bundleItems = @(".next", "public", "package.json", "package-lock.json")
  $nextConfigFiles = @(Get-ChildItem -Path "next.config.*" -File -Name -ErrorAction SilentlyContinue)
  if ($nextConfigFiles.Count -gt 0) {
    $bundleItems += $nextConfigFiles
  }

  $missingItems = @($bundleItems | Where-Object { -not (Test-Path $_) })
  if ($missingItems.Count -gt 0) {
    throw "Bundle items missing: $($missingItems -join ", ")"
  }

  Invoke-Step -Description "Creating deployment bundle $bundlePath" -Action {
    Compress-Archive -Path $bundleItems -DestinationPath $bundlePath -CompressionLevel Optimal -Force
  }

  Invoke-Step -Description "Uploading bundle to ${remoteTarget}:$remoteBundlePath" -Action {
    & scp $bundlePath "$remoteTarget`:$remoteBundlePath"
    if ($LASTEXITCODE -ne 0) { throw "scp upload failed" }
  }

  $remoteScript = @"
set -euo pipefail

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required on the VPS" >&2
  exit 1
fi

mkdir -p "\$APP_DIR"
cd "\$APP_DIR"

rm -rf .next public
rm -f package.json package-lock.json
rm -f next.config.js next.config.mjs next.config.ts

unzip -oq "\$BUNDLE_PATH" -d "\$APP_DIR"
rm -f "\$BUNDLE_PATH"

npm ci --omit=dev

if pm2 describe primetech-frontend >/dev/null 2>&1; then
  PORT=3000 pm2 restart primetech-frontend --update-env
else
  PORT=3000 pm2 start npm --name primetech-frontend -- start -- --port 3000
fi

pm2 save
"@

  Invoke-Step -Description "Deploying bundle on VPS and managing PM2 process" -Action {
    $remoteScript | & ssh $remoteTarget "APP_DIR='$vpsFrontendDir' BUNDLE_PATH='$remoteBundlePath' bash -s"
    if ($LASTEXITCODE -ne 0) { throw "remote deployment failed" }
  }

  Write-Host "Deployment completed to ${remoteTarget}:$vpsFrontendDir"
}
finally {
  Set-Location $prevLocation
  if (Test-Path $bundlePath) {
    Remove-Item -LiteralPath $bundlePath -Force
  }
}
