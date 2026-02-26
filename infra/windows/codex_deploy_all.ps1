#requires -Version 5.1
$ErrorActionPreference = "Stop"

# =========================
# CONFIG (edit if needed)
# =========================
$VPS_HOST = "87.106.143.66"
$VPS_USER = "root"
$SSH_KEY  = "C:\Users\joean\.ssh\prime_tech_codex"

# Local repo root (this script assumes it is run from repo root)
$ROOT = (Get-Location).Path

# Local artefacts expected (adjust names if yours differ)
$BACKEND_ZIP  = Join-Path $ROOT "prime-tech-backend.zip"
$FRONTEND_ZIP = Join-Path $ROOT "prime-tech-frontend.zip"

# Remote paths
$REMOTE_BACKEND_DIR  = "/opt/prime-tech-backend"
$REMOTE_FRONTEND_DIR = "/opt/prime-tech-frontend"
$REMOTE_UPLOAD_DIR   = "/root/prime-tech-upload"

# =========================
# INPUT (do NOT hardcode secrets)
# =========================
function Read-Secret([string]$Prompt) {
  $sec = Read-Host -AsSecureString $Prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

Write-Host ""
Write-Host "== Prime Tech: one-shot deploy to VPS ==" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path $SSH_KEY)) { throw "SSH key not found: $SSH_KEY" }

if (!(Test-Path $BACKEND_ZIP))  { throw "Missing backend zip: $BACKEND_ZIP" }
if (!(Test-Path $FRONTEND_ZIP)) { Write-Warning "Frontend zip not found: $FRONTEND_ZIP (continuing backend-only)" }

# Required secrets
$DB_PASSWORD = Read-Secret "Enter PostgreSQL password for role 'primetech'"
$ADMIN_TOKEN = Read-Secret "Enter ADMIN_TOKEN to set for backend"

# Optional values (safe defaults)
$DB_NAME = "primetech"
$DB_USER = "primetech"
$DB_HOST = "127.0.0.1"
$DB_PORT = "5432"

# Build DATABASE_URL explicitly (avoids localhost/IPv6 surprises)
$DATABASE_URL = "postgresql://${DB_USER}:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME?schema=public"

# =========================
# HELPERS
# =========================
function Run-Ssh([string]$Cmd) {
  $args = @("-i", $SSH_KEY, "$VPS_USER@$VPS_HOST", $Cmd)
  & ssh @args
  if ($LASTEXITCODE -ne 0) { throw "SSH command failed: $Cmd" }
}

function Run-Scp([string]$LocalPath, [string]$RemotePath) {
  $args = @("-i", $SSH_KEY, $LocalPath, "$VPS_USER@$VPS_HOST`:$RemotePath")
  & scp @args
  if ($LASTEXITCODE -ne 0) { throw "SCP failed: $LocalPath -> $RemotePath" }
}

# =========================
# UPLOAD
# =========================
Write-Host "1) Preparing remote upload directory..." -ForegroundColor Yellow
Run-Ssh "mkdir -p $REMOTE_UPLOAD_DIR"

Write-Host "2) Uploading backend zip..." -ForegroundColor Yellow
Run-Scp $BACKEND_ZIP "$REMOTE_UPLOAD_DIR/prime-tech-backend.zip"

if (Test-Path $FRONTEND_ZIP) {
  Write-Host "3) Uploading frontend zip..." -ForegroundColor Yellow
  Run-Scp $FRONTEND_ZIP "$REMOTE_UPLOAD_DIR/prime-tech-frontend.zip"
}

# =========================
# REMOTE ONE-SHOT DEPLOY
# =========================
Write-Host "4) Running remote deploy (backend + optional frontend)..." -ForegroundColor Yellow

# Note: we pass secrets via environment to the remote bash, not via echo in logs.
$remote = @"
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

UPLOAD_DIR="$REMOTE_UPLOAD_DIR"
BACKEND_DIR="$REMOTE_BACKEND_DIR"
FRONTEND_DIR="$REMOTE_FRONTEND_DIR"

# Secrets passed as env by SSH command wrapper:
#   DATABASE_URL, ADMIN_TOKEN

echo "== [A] Ensure base dirs =="
mkdir -p "\$BACKEND_DIR" "\$FRONTEND_DIR"

echo "== [B] Ensure Postgres is running =="
systemctl enable postgresql >/dev/null 2>&1 || true
systemctl start postgresql

echo "== [C] Ensure role + db exist, and password is set =="
# This runs as the postgres OS user (avoids peer-auth confusion)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$DB_NAME') THEN
    CREATE DATABASE $DB_NAME OWNER $DB_USER;
  END IF;
END
\$\$;
SQL

echo "== [D] Deploy backend from zip =="
rm -rf "\$BACKEND_DIR/.release"
mkdir -p "\$BACKEND_DIR/.release"
unzip -q -o "\$UPLOAD_DIR/prime-tech-backend.zip" -d "\$BACKEND_DIR/.release"

# If the zip contains a top-level folder, flatten it
if [ -d "\$BACKEND_DIR/.release/backend" ] && [ -f "\$BACKEND_DIR/.release/backend/package.json" ]; then
  rsync -a --delete "\$BACKEND_DIR/.release/backend/" "\$BACKEND_DIR/"
elif [ -f "\$BACKEND_DIR/.release/package.json" ]; then
  rsync -a --delete "\$BACKEND_DIR/.release/" "\$BACKEND_DIR/"
else
  echo "ERROR: backend zip layout not recognised (package.json not found)."
  find "\$BACKEND_DIR/.release" -maxdepth 3 -type f -name package.json -print || true
  exit 1
fi

echo "== [E] Write / update backend .env.production =="
ENV_FILE="\$BACKEND_DIR/.env.production"
umask 077
cat > "\$ENV_FILE" <<ENV
NODE_ENV=production
PORT=4000
DATABASE_URL=$DATABASE_URL
ADMIN_TOKEN=$ADMIN_TOKEN
# Add SMTP / SITE URL vars here when ready
ENV

echo "== [F] Install deps + Prisma migrate =="
cd "\$BACKEND_DIR"
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy

echo "== [G] PM2 (backend) =="
npm -g ls pm2 >/dev/null 2>&1 || npm i -g pm2
# Prefer ecosystem if present, otherwise start a basic process
if [ -f "\$BACKEND_DIR/ecosystem.config.js" ]; then
  pm2 start "\$BACKEND_DIR/ecosystem.config.js" --update-env
else
  pm2 start "\$BACKEND_DIR/dist/server.js" --name prime-tech-backend --update-env || \
  pm2 start "\$BACKEND_DIR/src/server.ts" --name prime-tech-backend --update-env || true
fi
pm2 save

echo "== [H] Optional frontend deploy if zip is present =="
if [ -f "\$UPLOAD_DIR/prime-tech-frontend.zip" ]; then
  rm -rf "\$FRONTEND_DIR/.release"
  mkdir -p "\$FRONTEND_DIR/.release"
  unzip -q -o "\$UPLOAD_DIR/prime-tech-frontend.zip" -d "\$FRONTEND_DIR/.release"

  if [ -d "\$FRONTEND_DIR/.release/frontend" ] && [ -f "\$FRONTEND_DIR/.release/frontend/package.json" ]; then
    rsync -a --delete "\$FRONTEND_DIR/.release/frontend/" "\$FRONTEND_DIR/"
  elif [ -f "\$FRONTEND_DIR/.release/package.json" ]; then
    rsync -a --delete "\$FRONTEND_DIR/.release/" "\$FRONTEND_DIR/"
  else
    echo "WARNING: frontend zip layout not recognised; skipping frontend."
  fi

  cd "\$FRONTEND_DIR"
  npm ci --omit=dev || npm ci
  npm run build || true

  if [ -f "\$FRONTEND_DIR/ecosystem.config.js" ]; then
    pm2 start "\$FRONTEND_DIR/ecosystem.config.js" --update-env
    pm2 save
  fi
fi

echo "== [I] Health checks =="
pm2 list || true
curl -fsS http://127.0.0.1:4000/api/health && echo "" || true

echo "== DONE =="
"@

# Pass secrets to remote as env vars so they are not printed by PowerShell.
$escapedRemote = $remote.Replace("`r","").Replace("`n","; ")
$cmd = "DATABASE_URL='$DATABASE_URL' ADMIN_TOKEN='$ADMIN_TOKEN' bash -lc " + ('"' + $escapedRemote.Replace('"','\"') + '"')

Run-Ssh $cmd

Write-Host ""
Write-Host "Deployment completed. Next: confirm API is reachable via your reverse proxy / domain." -ForegroundColor Green
