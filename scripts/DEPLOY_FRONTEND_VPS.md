# Frontend VPS Deploy Script

This script builds the Next.js frontend locally, bundles build artifacts, uploads them to your VPS, installs production dependencies, and restarts PM2.

## Environment variables

Set these in PowerShell before running:

```powershell
$env:VPS_HOST = "203.0.113.10"
$env:VPS_USER = "root" # optional, defaults to root
$env:VPS_FRONTEND_DIR = "/opt/prime-tech-frontend" # optional
```

`VPS_HOST` is required. The script exits with a clear error if it is missing.

## Run

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-frontend-vps.ps1
```

## What it does

- Runs `npm ci` and `npm run build` inside `frontend`
- Creates a zip bundle with `.next`, `public`, `package.json`, `package-lock.json`, and `next.config.*`
- Uploads the zip via `scp`
- Extracts to `$VPS_FRONTEND_DIR` on the VPS
- Runs `npm ci --omit=dev`
- Restarts PM2 process `primetech-frontend` (or starts it on port `3000` if missing)
- Runs `pm2 save`
