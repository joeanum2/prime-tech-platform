<# 
Unified VPS Deployment (one command)

$ErrorActionPreference = "Stop"
Run from repo root:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\infra\windows\deploy_vps_unified.ps1

Optional:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\infra\windows\deploy_vps_unified.ps1 `
    -VpsIp 87.106.143.66 -VpsUser root -KeyPath "$env:USERPROFILE\.ssh\prime_tech_codex" `
    -RemoteRoot "/opt" -BackendDirName "prime-tech-backend" -FrontendDirName "prime-tech-frontend"

What it does (end-to-end):
- Creates backend/frontend zip bundles (if missing)
- Uploads bundles to VPS (/root)
- Deploys backend to /opt/prime-tech-backend, installs deps, runs prisma migrate, builds if needed
- Starts/restarts PM2 with correct dist entry (auto-detect)
- Deploys frontend bundle to /opt/prime-tech-frontend (static) and prints where it is
- Verifies backend port is listening (best-effort)
#>

[CmdletBinding()]
param(
  [string]$VpsIp = "87.106.143.66",
  [string]$VpsUser = "root",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\prime_tech_codex",

  # Remote layout
  [string]$RemoteRoot = "/opt",
  [string]$BackendDirName = "prime-tech-backend",
  [string]$FrontendDirName = "prime-tech-frontend",

  # Local project layout (repo root assumed current dir)
  [string]$BackendZip = "prime-tech-backend.zip",
  [string]$FrontendZip = "prime-tech-frontend.zip",

  # App runtime
  [string]$Pm2AppName = "prime-tech-backend",
  [int]$BackendPort = 4000
)

$ErrorActionPreference = "Stop"

function Assert-Exists($Path, $Label) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "$Label not found: $Path" }
}

function Run($Cmd) {
  Write-Host "`n>>> $Cmd" -ForegroundColor Cyan
  iex $Cmd
}

function Ensure-Zip($ZipName) {
  if (Test-Path -LiteralPath $ZipName) {
    Write-Host "ZIP exists: $ZipName" -ForegroundColor Green
    return
  }

  # Heuristic: create zip with repo subfolders if present.
  # Adjust these folders if your repo structure differs.
  $candidates = @(
    @{ name="backend";  path="backend"  },
    @{ name="frontend"; path="frontend" },
    @{ name="api";      path="api"      },
    @{ name="web";      path="web"      }
  )

  $items = @()
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c.path) { $items += $c.path }
  }

  if ($items.Count -eq 0) {
    # Fallback: zip the entire repo (excluding node_modules/.git) into the requested zip.
    Write-Host "No conventional folders found; zipping repo (excluding node_modules/.git) -> $ZipName" -ForegroundColor Yellow
    $tmp = Join-Path $env:TEMP ("deployzip_" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $tmp | Out-Null

    $exclude = @("\.git\", "\node_modules\", "\dist\", "\.next\", "\.turbo\", "\coverage\")
    Get-ChildItem -Recurse -Force | Where-Object {
      $p = $_.FullName
      foreach ($ex in $exclude) { if ($p -like "*$ex*") { return $false } }
      return $true
    } | ForEach-Object {
      $rel = Resolve-Path $_.FullName | ForEach-Object { $_.Path.Substring((Resolve-Path ".").Path.Length).TrimStart("\") }
      $dest = Join-Path $tmp $rel
      if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
      } else {
        New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
      }
    }

    if (Test-Path -LiteralPath $ZipName) { Remove-Item -LiteralPath $ZipName -Force }
    Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $ZipName -Force
    Remove-Item -LiteralPath $tmp -Recurse -Force
    Write-Host "Created ZIP: $ZipName" -ForegroundColor Green
    return
  }

  Write-Host "Creating ZIP: $ZipName from: $($items -join ', ')" -ForegroundColor Yellow
  if (Test-Path -LiteralPath $ZipName) { Remove-Item -LiteralPath $ZipName -Force }
  Compress-Archive -Path $items -DestinationPath $ZipName -Force
  Write-Host "Created ZIP: $ZipName" -ForegroundColor Green
}

# --- Preconditions ---
Assert-Exists $KeyPath "SSH key"
Write-Host "Repo root: $(Resolve-Path .)" -ForegroundColor Gray

# Create ZIPs if missing
Ensure-Zip $BackendZip
Ensure-Zip $FrontendZip

Assert-Exists $BackendZip "Backend ZIP"
Assert-Exists $FrontendZip "Frontend ZIP"

# --- Upload ZIPs to VPS (/root) ---
$ssh = "ssh -i `"$KeyPath`" $VpsUser@$VpsIp"
$scp = "scp -i `"$KeyPath`""

Run "$scp `"$BackendZip`" $VpsUser@${VpsIp}:/root/"
Run "$scp `"$FrontendZip`" $VpsUser@${VpsIp}:/root/"

# --- Remote deploy (single SSH) ---
$remoteBackend = "$RemoteRoot/$BackendDirName"
$remoteFrontend = "$RemoteRoot/$FrontendDirName"

$remoteScript = @"
set -euo pipefail

echo "== Prime Tech unified deploy =="

BACKEND_ZIP="/root/$BackendZip"
FRONTEND_ZIP="/root/$FrontendZip"
BACKEND_DIR="$remoteBackend"
FRONTEND_DIR="$remoteFrontend"
PM2_APP="$Pm2AppName"
BACKEND_PORT="$BackendPort"

echo "Backend dir: \$BACKEND_DIR"
echo "Frontend dir: \$FRONTEND_DIR"

# ---- helpers ----
need_cmd() { command -v "\$1" >/dev/null 2>&1 || { echo "ERROR: missing command: \$1"; exit 1; }; }

need_cmd unzip
need_cmd node
need_cmd npm

# PM2 install if missing
if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing pm2..."
  npm i -g pm2
fi

# ---- deploy backend ----
if [ ! -f "\$BACKEND_ZIP" ]; then
  echo "ERROR: backend zip missing at \$BACKEND_ZIP"
  exit 1
fi

mkdir -p "\$BACKEND_DIR"
echo "Extracting backend..."
rm -rf "\$BACKEND_DIR/.deploy_tmp"
mkdir -p "\$BACKEND_DIR/.deploy_tmp"
unzip -o "\$BACKEND_ZIP" -d "\$BACKEND_DIR/.deploy_tmp" >/dev/null

# If zip contains a top-level folder, flatten it
TOP_DIR=`$(find "\$BACKEND_DIR/.deploy_tmp" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)
if [ -n "\$TOP_DIR" ] && [ `$(find "\$BACKEND_DIR/.deploy_tmp" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 ]; then
  echo "Flattening backend bundle..."
  rsync -a --delete "\$TOP_DIR/" "\$BACKEND_DIR/"
else
  rsync -a --delete "\$BACKEND_DIR/.deploy_tmp/" "\$BACKEND_DIR/"
fi
rm -rf "\$BACKEND_DIR/.deploy_tmp"

cd "\$BACKEND_DIR"

# ---- env handling ----
# Prefer .env.production if present, else .env
if [ ! -f ".env" ] && [ -f ".env.production" ]; then
  echo "Copying .env.production -> .env"
  cp .env.production .env
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env from .env.example (you MUST fill secrets afterwards)"
  cp .env.example .env
fi

if [ ! -f ".env" ]; then
  echo "ERROR: No .env or .env.production or .env.example found in \$BACKEND_DIR"
  echo "Create \$BACKEND_DIR/.env and rerun."
  exit 1
fi

# Ensure DATABASE_URL exists (do NOT print value)
if ! grep -q '^DATABASE_URL=' .env; then
  echo "ERROR: DATABASE_URL missing in \$BACKEND_DIR/.env"
  exit 1
fi

echo "Installing backend dependencies..."
npm ci --omit=dev || npm install --omit=dev

# If prisma exists, run migrate deploy
if [ -d "prisma" ] || [ -f "prisma/schema.prisma" ]; then
  echo "Running prisma generate..."
  npx prisma generate
  echo "Running prisma migrate deploy..."
  npx prisma migrate deploy
fi

# Build if build script exists
if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)"; then
  echo "Running build..."
  npm run build
fi

# ---- detect entrypoint for PM2 ----
ENTRY=""
# 1) package.json main
MAIN=`$(node -e "const p=require('./package.json'); process.stdout.write(p.main||'');")
if [ -n "\$MAIN" ] && [ -f "\$MAIN" ]; then ENTRY="\$MAIN"; fi

# 2) common dist entries
if [ -z "\$ENTRY" ]; then
  for f in dist/index.js dist/main.js dist/server.js build/index.js build/main.js; do
    if [ -f "\$f" ]; then ENTRY="\$f"; break; fi
  done
fi

# 3) last resort: first js file under dist
if [ -z "\$ENTRY" ] && [ -d "dist" ]; then
  ENTRY=`$(find dist -maxdepth 2 -type f -name "*.js" | head -n 1 || true)
fi

if [ -z "\$ENTRY" ]; then
  echo "ERROR: Could not determine backend entrypoint for PM2."
  echo "Checked package.json main, dist/* common names, dist/*.js."
  exit 1
fi

echo "PM2 entry: \$ENTRY"
pm2 describe "\$PM2_APP" >/dev/null 2>&1 && pm2 delete "\$PM2_APP" || true
pm2 start "\$ENTRY" --name "\$PM2_APP"
pm2 save

# ---- deploy frontend (static) ----
if [ ! -f "\$FRONTEND_ZIP" ]; then
  echo "ERROR: frontend zip missing at \$FRONTEND_ZIP"
  exit 1
fi

mkdir -p "\$FRONTEND_DIR"
echo "Extracting frontend..."
rm -rf "\$FRONTEND_DIR/.deploy_tmp"
mkdir -p "\$FRONTEND_DIR/.deploy_tmp"
unzip -o "\$FRONTEND_ZIP" -d "\$FRONTEND_DIR/.deploy_tmp" >/dev/null

TOP_DIR_F=`$(find "\$FRONTEND_DIR/.deploy_tmp" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)
if [ -n "\$TOP_DIR_F" ] && [ `$(find "\$FRONTEND_DIR/.deploy_tmp" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 ]; then
  echo "Flattening frontend bundle..."
  rsync -a --delete "\$TOP_DIR_F/" "\$FRONTEND_DIR/"
else
  rsync -a --delete "\$FRONTEND_DIR/.deploy_tmp/" "\$FRONTEND_DIR/"
fi
rm -rf "\$FRONTEND_DIR/.deploy_tmp"

echo "Frontend deployed to: \$FRONTEND_DIR"
echo "NOTE: If you serve via Plesk, point your document root or reverse proxy to this folder (or its build output)."

# ---- verification ----
echo "PM2 status:"
pm2 status "\$PM2_APP" || true

echo "Listening check (best-effort):"
(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null || true) | grep -E "(:\$BACKEND_PORT\\b)" || true

echo "== DEPLOY COMPLETE =="
"@

Write-Host "`n>>> Remote deploy via SSH (single session)" -ForegroundColor Cyan
$remoteScript | ssh -i "$KeyPath" $VpsUser@$VpsIp "bash -s"

Write-Host "`nSUCCESS: Unified deployment finished." -ForegroundColor Green
Write-Host "Backend: $remoteBackend (PM2 app: $Pm2AppName)" -ForegroundColor Green
Write-Host "Frontend: $remoteFrontend" -ForegroundColor Green
