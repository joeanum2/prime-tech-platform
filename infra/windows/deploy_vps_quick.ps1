$ErrorActionPreference = "Stop"

# ====== CONFIG (edit only if needed) ======
$VPS_IP  = "87.106.143.66"
$SSH_KEY = "C:\Users\joean\.ssh\prime_tech_codex"

$BACKEND_ZIP  = "prime-tech-backend.zip"
$FRONTEND_ZIP = "prime-tech-frontend.zip"

$REMOTE_BACKEND_DIR  = "/opt/prime-tech-backend"
$REMOTE_FRONTEND_DIR = "/opt/prime-tech-frontend"

# ====== INPUTS ======
Write-Host ""
Write-Host "Enter DATABASE_URL password for Postgres user 'primetech' (will be written to .env.production on VPS)."
$DB_PASSWORD = Read-Host "DB password"

Write-Host ""
Write-Host "Enter ADMIN_TOKEN to use on the backend (must match what you want in production)."
$ADMIN_TOKEN = Read-Host "ADMIN_TOKEN"

# Change only if your DB name/user differs
$DATABASE_URL = "postgresql://primetech:$DB_PASSWORD@127.0.0.1:5432/primetech?schema=public"

# ====== HELPERS ======
function Run($cmd) {
  Write-Host "`n>>> $cmd"
  cmd /c $cmd
  if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

function Ssh($remoteCmd) {
  $escaped = $remoteCmd.Replace('"','\"')
  Run "ssh -i `"$SSH_KEY`" root@$VPS_IP `"$escaped`""
}

function Scp($localPath, $remotePath) {
  Run "scp -i `"$SSH_KEY`" `"$localPath`" root@${VPS_IP}:`"$remotePath`""
}

# ====== ENSURE ZIPs EXIST (create if missing) ======
Set-Location (Split-Path $PSScriptRoot -Parent -Resolve)  # goes to ...\prime-tech-platform

if (-not (Test-Path ".\$BACKEND_ZIP")) {
  Write-Host "`nBackend zip not found. Creating $BACKEND_ZIP ..."
  Run "powershell -NoProfile -ExecutionPolicy Bypass -Command `"Compress-Archive -Path backend\* -DestinationPath .\$BACKEND_ZIP -Force`""
}

if (-not (Test-Path ".\$FRONTEND_ZIP")) {
  Write-Host "`nFrontend zip not found. Creating $FRONTEND_ZIP ..."
  Run "powershell -NoProfile -ExecutionPolicy Bypass -Command `"Compress-Archive -Path frontend\* -DestinationPath .\$FRONTEND_ZIP -Force`""
}

# ====== UPLOAD ======
Write-Host "`nUploading ZIPs to VPS..."
Scp ".\$BACKEND_ZIP"  "/root/"
Scp ".\$FRONTEND_ZIP" "/root/"

# ====== DEPLOY ON VPS ======
$remote = @"
set -euo pipefail

echo "== Ensure dirs =="
mkdir -p "$REMOTE_BACKEND_DIR" "$REMOTE_FRONTEND_DIR"

echo "== Unzip backend =="
rm -rf "$REMOTE_BACKEND_DIR"/*
unzip -oq "/root/$BACKEND_ZIP" -d "$REMOTE_BACKEND_DIR"

echo "== Unzip frontend =="
rm -rf "$REMOTE_FRONTEND_DIR"/*
unzip -oq "/root/$FRONTEND_ZIP" -d "$REMOTE_FRONTEND_DIR"

echo "== Write backend .env.production =="
cat > "$REMOTE_BACKEND_DIR/.env.production" <<'ENV'
NODE_ENV=production
PORT=4000
DATABASE_URL=$DATABASE_URL
ADMIN_TOKEN=$ADMIN_TOKEN
ENV

# Replace placeholders literally (safe, no sed quoting issues)
perl -0777 -i -pe 's/\$DATABASE_URL/'"'"$DATABASE_URL"'"'/g; s/\$ADMIN_TOKEN/'"'"$ADMIN_TOKEN"'"'/g' "$REMOTE_BACKEND_DIR/.env.production"

echo "== Ensure Postgres running =="
systemctl enable postgresql >/dev/null 2>&1 || true
systemctl start postgresql  >/dev/null 2>&1 || true
systemctl is-active --quiet postgresql && echo "Postgres: active"

echo "== Backend install/build/migrate =="
cd "$REMOTE_BACKEND_DIR"
if [ -f package-lock.json ]; then npm ci; else npm i; fi
# run build if present
node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" && npm run build || echo "No backend build script, skipping."
# Prisma migrate if prisma exists
if [ -d prisma ] || node -e "const p=require('./package.json'); process.exit((p.dependencies&&p.dependencies.prisma)||(p.devDependencies&&p.devDependencies.prisma)?0:1)"; then
  npx prisma generate || true
  npx prisma migrate deploy
fi

echo "== Start/Restart backend via PM2 =="
pm2 describe prime-tech-backend >/dev/null 2>&1 && pm2 delete prime-tech-backend || true
# Prefer npm start
pm2 start npm --name prime-tech-backend -- start
pm2 save

echo "== Frontend install/build/start =="
cd "$REMOTE_FRONTEND_DIR"
if [ -f package-lock.json ]; then npm ci; else npm i; fi
node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.build ? 0 : 1)" && npm run build || echo "No frontend build script, skipping."
pm2 describe prime-tech-frontend >/dev/null 2>&1 && pm2 delete prime-tech-frontend || true
pm2 start npm --name prime-tech-frontend -- start
pm2 save

echo "== Status =="
pm2 list

echo "== Backend health check =="
curl -fsS http://127.0.0.1:4000/api/health && echo ""
"@

# Use bash -lc so the here-string executes properly
Ssh "bash -lc `"$remote`""

Write-Host "`nDONE. If you paste the PM2 list output here, I will confirm both processes are healthy."
