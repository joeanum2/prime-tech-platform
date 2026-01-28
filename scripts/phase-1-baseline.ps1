Param()

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
Set-Location $repoRoot

if (-not (Test-Path "backend")) {
  Write-Error "Missing backend directory. Run from repo root."
  exit 1
}

Push-Location "backend"

Write-Host "Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Generating Prisma client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running Prisma migrations (requires DATABASE_URL)..."
npx prisma migrate dev --name init
if ($LASTEXITCODE -ne 0) {
  Write-Error "Prisma migrate failed. Ensure DATABASE_URL is set and the database is reachable."
  Pop-Location
  exit 1
}

Write-Host "Seeding database..."
npm run db:seed
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Pop-Location

Write-Host "Baseline complete. Next commands:"
Write-Host "  cd backend"
Write-Host "  npm run dev"
Write-Host "  curl http://127.0.0.1:4000/api/health"
