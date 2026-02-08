$ErrorActionPreference = "Stop"

$backend = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $backend ".env"

if (-not (Test-Path $envPath)) {
  throw "Missing .env at $envPath"
}

$line = Get-Content $envPath | Where-Object { $_ -match '^(ADMIN_TOKEN|PTP_ADMIN_TOKEN)=' } | Select-Object -First 1
if (-not $line) { throw "No ADMIN_TOKEN or PTP_ADMIN_TOKEN found in backend/.env" }

$token = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
if (-not $token) { throw "Token line found, but token value is empty." }

Write-Host ("tokenPresent={0} tokenLength={1}" -f [bool]$token, $token.Length)

$p = Start-Process -FilePath "npm" -ArgumentList @("run","dev") -WorkingDirectory $backend -PassThru

$portReady = $false
for ($i = 0; $i -lt 20; $i++) {
  try {
    $conn = Test-NetConnection -ComputerName "127.0.0.1" -Port 4000 -WarningAction SilentlyContinue
    if ($conn.TcpTestSucceeded) { $portReady = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 500
}

if (-not $portReady) {
  try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw "Backend did not start listening on port 4000"
}

function Expect-Status {
  param(
    [string]$Name,
    [string]$Uri,
    [hashtable]$Headers,
    [int]$ExpectedStatus
  )

  try {
    $resp = Invoke-RestMethod -Uri $Uri -Headers $Headers -TimeoutSec 5
    if ($ExpectedStatus -eq 200) {
      Write-Host ("PASS {0} -> 200" -f $Name)
      $resp | ConvertTo-Json -Depth 10
      return $true
    }
    Write-Host ("FAIL {0} -> expected {1} but got 200" -f $Name, $ExpectedStatus)
    $resp | ConvertTo-Json -Depth 10
    return $false
  } catch {
    $status = -1
    if ($_.Exception.Response) {
      $status = $_.Exception.Response.StatusCode.value__
    }
    if ($status -eq $ExpectedStatus) {
      Write-Host ("PASS {0} -> {1}" -f $Name, $ExpectedStatus)
      return $true
    }
    Write-Host ("FAIL {0} -> expected {1} but got {2}" -f $Name, $ExpectedStatus, $status)
    return $false
  }
}

$base = "http://127.0.0.1:4000/api/admin/health"
$headers = @{ "x-admin-token" = $token }

$ok1 = Expect-Status -Name "admin/health without token" -Uri $base -Headers @{} -ExpectedStatus 401
$ok2 = Expect-Status -Name "admin/health with token" -Uri $base -Headers $headers -ExpectedStatus 200

if ($ok1 -and $ok2) {
  Write-Host "VERIFY-ADMIN: PASS"
} else {
  Write-Host "VERIFY-ADMIN: FAIL"
}

try { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue } catch {}
