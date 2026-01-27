# ============================================================
# Repair app.ts middleware wiring (remove authStub + dedupe resolveTenant)
# ============================================================
$ErrorActionPreference = "Stop"

$path = ".\backend\src\app.ts"
if (-not (Test-Path $path)) { throw "Missing file: $path" }

$app = Get-Content -Raw $path

# 1) Remove the crashing authStub middleware line (any quote style)
$app = $app -replace '^\s*app\.use\(\s*["'']\/api["'']\s*,\s*authStub\s*\)\s*;\s*\r?\n', ''

# 2) Dedupe resolveTenant: keep the FIRST occurrence, remove subsequent duplicates
# Normalize both quote styles first
$pattern = 'app\.use\(\s*["'']\/api["'']\s*,\s*resolveTenant\s*\)\s*;'
$matches = [regex]::Matches($app, $pattern)

if ($matches.Count -gt 1) {
  # Remove all occurrences, then re-insert a single one at the position of the first match
  $firstIndex = $matches[0].Index
  $appNoAll = [regex]::Replace($app, $pattern + '\s*\r?\n?', '')
  $insert = '  app.use("/api", resolveTenant);' + "`r`n"
  $app = $appNoAll.Insert($firstIndex, $insert)
}

# 3) Ensure resolveTenant happens BEFORE the routes (and before /api/auth etc.)
# If resolveTenant is after express.json, move it above webhooks block.
$appLines = $app -split "`r?`n"
$idxResolve = ($appLines | Select-Object -Index (0..($appLines.Length-1)) | ForEach-Object { $_ }) | Out-Null

# Simple reorder: if resolveTenant line exists after express.json, move it to just before the webhooksRoutes line
$resolveLineIdx = -1
$expressJsonIdx = -1
$webhooksIdx = -1
for ($i=0; $i -lt $appLines.Length; $i++) {
  if ($resolveLineIdx -lt 0 -and $appLines[$i] -match 'app\.use\("\/api",\s*resolveTenant\);') { $resolveLineIdx = $i }
  if ($expressJsonIdx -lt 0 -and $appLines[$i] -match 'app\.use\(express\.json') { $expressJsonIdx = $i }
  if ($webhooksIdx -lt 0 -and $appLines[$i] -match 'app\.use\("\/api\/webhooks"') { $webhooksIdx = $i }
}

if ($resolveLineIdx -gt -1 -and $expressJsonIdx -gt -1 -and $resolveLineIdx -gt $expressJsonIdx -and $webhooksIdx -gt -1) {
  $line = $appLines[$resolveLineIdx]
  $appLines = $appLines | Where-Object { $_ -ne $line }
  # recompute webhooks idx after removal
  $webhooksIdx2 = -1
  for ($i=0; $i -lt $appLines.Length; $i++) {
    if ($appLines[$i] -match 'app\.use\("\/api\/webhooks"') { $webhooksIdx2 = $i; break }
  }
  if ($webhooksIdx2 -gt -1) {
    $before = $appLines[0..($webhooksIdx2-1)]
    $after  = $appLines[$webhooksIdx2..($appLines.Length-1)]
    $appLines = @($before + $line + $after)
  }
  $app = ($appLines -join "`r`n")
}

Set-Content -Encoding UTF8 $path $app
Write-Host "OK: Removed authStub, deduped resolveTenant, and ensured ordering." -ForegroundColor Green
