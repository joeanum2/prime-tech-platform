param(
  [string]$BaseUrl = "http://127.0.0.1:4000",
  [string]$Email = "admin@primetech.local",
  [string]$Password = "PrimeTechAdmin123!"
)

$ErrorActionPreference = "Stop"

function Fail($message) {
  Write-Error $message
  exit 1
}

if ([string]::IsNullOrWhiteSpace($Email)) {
  Fail "Missing admin email. Provide -Email or set a default in the script."
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  if (-not [string]::IsNullOrWhiteSpace($env:ADMIN_PASSWORD)) {
    $Password = $env:ADMIN_PASSWORD
  }
}

if ([string]::IsNullOrWhiteSpace($Password)) {
  Fail "Missing admin password. Provide -Password or set ADMIN_PASSWORD in the environment."
}

$baseUri = [Uri]$BaseUrl
$forwardedHost = $baseUri.Host
if ([string]::IsNullOrWhiteSpace($forwardedHost)) {
  $forwardedHost = "127.0.0.1"
}

$tempDir = Join-Path ([IO.Path]::GetTempPath()) ("admin-smoke-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$cookieJar = Join-Path $tempDir "cookies.txt"

function Invoke-Curl($method, $url, $body, $cookiePath) {
  if ($body) {
    $result = $body | & curl.exe -s -w "`n%{http_code}" -X $method -c $cookiePath -b $cookiePath `
      -H "Content-Type: application/json" -H ("x-forwarded-host: " + $forwardedHost) `
      --data-binary "@-" $url
  } else {
    $result = & curl.exe -s -w "`n%{http_code}" -X $method -c $cookiePath -b $cookiePath `
      -H "Content-Type: application/json" -H ("x-forwarded-host: " + $forwardedHost) `
      $url
  }
  if ($LASTEXITCODE -ne 0) {
    Fail "curl failed for $url"
  }

  $lines = $result -split "`n"
  $status = $lines[-1].Trim()
  $respBody = ($lines[0..($lines.Length - 2)] -join "`n").Trim()
  return @{ Status = $status; Body = $respBody }
}

$loginBody = (@{ email = $Email; password = $Password } | ConvertTo-Json -Compress)
$login = Invoke-Curl "POST" ($BaseUrl.TrimEnd("/") + "/api/auth/login") $loginBody $cookieJar
Write-Output "POST /api/auth/login -> $($login.Status)"
Write-Output $login.Body
if ($login.Status -ne "200") {
  Fail "Login failed with status $($login.Status)"
}

$adminHealth = Invoke-Curl "GET" ($BaseUrl.TrimEnd("/") + "/api/admin/health") $null $cookieJar
Write-Output "GET /api/admin/health -> $($adminHealth.Status)"
Write-Output $adminHealth.Body
if ($adminHealth.Status -ne "200") {
  Fail "Admin health failed with status $($adminHealth.Status)"
}

$adminStats = Invoke-Curl "GET" ($BaseUrl.TrimEnd("/") + "/api/admin/stats") $null $cookieJar
Write-Output "GET /api/admin/stats -> $($adminStats.Status)"
Write-Output $adminStats.Body
if ($adminStats.Status -ne "200") {
  Fail "Admin stats failed with status $($adminStats.Status)"
}

Write-Output "OK: admin smoke passed"
