$ErrorActionPreference = "Stop"

$VPS_IP  = "87.106.143.66"
$SSH_KEY = "C:\Users\joean\.ssh\prime_tech_codex"
$REMOTE  = "root@$VPS_IP"

Write-Host "=== Testing SSH connection ==="
ssh -i $SSH_KEY $REMOTE "whoami && hostname && date -u"

Write-Host "=== Uploading deployment files ==="

scp -i $SSH_KEY ".\prime-tech-backend.zip"  "${REMOTE}:/root/"
scp -i $SSH_KEY ".\prime-tech-frontend.zip" "${REMOTE}:/root/"
scp -i $SSH_KEY ".\infra\vps\bootstrap_vps.sh" "${REMOTE}:/root/"
scp -i $SSH_KEY ".\infra\vps\deploy_vps.sh"    "${REMOTE}:/root/"

Write-Host "=== Running bootstrap ==="
ssh -i $SSH_KEY $REMOTE "bash /root/bootstrap_vps.sh"

Write-Host "=== Running deploy ==="
ssh -i $SSH_KEY $REMOTE "bash /root/deploy_vps.sh"

Write-Host "=== Checking PM2 status ==="
ssh -i $SSH_KEY $REMOTE "pm2 list"

Write-Host "=== Deployment finished ==="