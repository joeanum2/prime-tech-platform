# ============================================================
# Phase D.0 — Write backend\.env (replace) + update .env.example
# ============================================================
$ErrorActionPreference = "Stop"

$Root    = (Get-Location).Path
$Backend = Join-Path $Root "backend"
$EnvPath = Join-Path $Backend ".env"
$EnvExamplePath = Join-Path $Backend ".env.example"

if (-not (Test-Path $Backend)) { throw "Run from repo root. backend/ not found." }

# ---- EDIT THESE 2 LINES ONLY (real Stripe keys) ----
$STRIPE_SECRET_KEY     = "sk_test_..."   # <- replace with your real key
$STRIPE_WEBHOOK_SECRET = "whsec_..."     # <- replace with your real key
# ---------------------------------------------------

# Generate a strong SESSION_SECRET automatically if the current .env is missing or has placeholder
function New-SessionSecret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

$sessionSecret = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
if (Test-Path $EnvPath) {
  $existing = Get-Content -Raw $EnvPath
  $m = [regex]::Match($existing, "(?m)^\s*SESSION_SECRET\s*=\s*(.+)\s*$")
  if ($m.Success) {
    $val = $m.Groups[1].Value.Trim()
    if ($val -and $val -ne "CHANGE_ME_TO_A_LONG_RANDOM_STRING") { $sessionSecret = $val }
    else { $sessionSecret = New-SessionSecret }
  } else {
    $sessionSecret = New-SessionSecret
  }
} else {
  $sessionSecret = New-SessionSecret
}

$envContent = @"
# Server
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://primetech_app:StrongPassword123!@localhost:5432/primetech?schema=public

# Sessions
SESSION_SECRET=$sessionSecret
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Stripe
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel

# AWS / S3
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
S3_BUCKET_PRIVATE=primetech-private
"@

# Replace backend\.env fully
Set-Content -Encoding UTF8 -Path $EnvPath -Value $envContent
Write-Host "OK: Wrote (replaced) backend\.env" -ForegroundColor Green

# Update backend\.env.example without secrets
$example = @"
# Server
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/primetech?schema=public

# Sessions
SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CANCEL_URL=http://localhost:3000/checkout/cancel

# AWS / S3
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
S3_BUCKET_PRIVATE=primetech-private
"@
Set-Content -Encoding UTF8 -Path $EnvExamplePath -Value $example
Write-Host "OK: Wrote backend\.env.example" -ForegroundColor Green

Write-Host "`nNEXT:" -ForegroundColor Cyan
Write-Host "1) cd backend; npm i stripe" -ForegroundColor Yellow
Write-Host "2) cd backend; npm run dev" -ForegroundColor Yellow
Write-Host "3) (Optional) stripe listen --forward-to http://localhost:4000/api/webhooks/stripe" -ForegroundColor Yellow
