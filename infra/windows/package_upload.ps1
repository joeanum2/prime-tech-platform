$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BackendSource = Join-Path $RepoRoot "backend"
$FrontendSource = Join-Path $RepoRoot "frontend"
$VpsScriptRoot = Join-Path $RepoRoot "infra\vps"
$TmpDir = Join-Path $RepoRoot ".deploy-tmp"

$BackendZip = Join-Path $TmpDir "prime-tech-backend.zip"
$FrontendZip = Join-Path $TmpDir "prime-tech-frontend.zip"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function New-CleanZip([string]$SourceDir, [string]$DestinationZip) {
  $stage = Join-Path $TmpDir ("stage-" + [System.IO.Path]::GetRandomFileName())
  New-Item -ItemType Directory -Path $stage -Force | Out-Null

  robocopy $SourceDir $stage /MIR /XD node_modules .next .turbo dist build coverage .git /XF .env .env.* | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed for $SourceDir"
  }

  if (Test-Path $DestinationZip) {
    Remove-Item $DestinationZip -Force
  }

  Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $DestinationZip -CompressionLevel Optimal
  Remove-Item $stage -Recurse -Force
}

Assert-Command "ssh"
Assert-Command "scp"
Assert-Command "robocopy"

New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null

Write-Host "Building clean backend bundle..."
New-CleanZip -SourceDir $BackendSource -DestinationZip $BackendZip

Write-Host "Building clean frontend bundle..."
New-CleanZip -SourceDir $FrontendSource -DestinationZip $FrontendZip

Write-Host "Uploading deployment assets to primetech-vps..."
scp $BackendZip primetech-vps:/tmp/prime-tech-backend.zip
scp $FrontendZip primetech-vps:/tmp/prime-tech-frontend.zip
scp (Join-Path $VpsScriptRoot "bootstrap_vps.sh") primetech-vps:/tmp/bootstrap_vps.sh
scp (Join-Path $VpsScriptRoot "deploy_vps.sh") primetech-vps:/tmp/deploy_vps.sh
scp (Join-Path $VpsScriptRoot "pm2.ecosystem.config.cjs") primetech-vps:/tmp/pm2.ecosystem.config.cjs

Write-Host "Running remote bootstrap and deploy..."
ssh primetech-vps "sudo bash -lc 'chmod +x /tmp/bootstrap_vps.sh /tmp/deploy_vps.sh && /tmp/bootstrap_vps.sh && /tmp/deploy_vps.sh'"

Write-Host "Deployment completed."
