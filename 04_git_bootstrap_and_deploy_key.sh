#!/usr/bin/env bash
set -euo pipefail

# REQUIRED: set these to your GitHub repo SSH URLs (recommended)
# Example:
# BACKEND_REPO="git@github.com:joeanum2/prime-tech-backend.git"
# FRONTEND_REPO="git@github.com:joeanum2/prime-tech-frontend.git"
BACKEND_REPO="${BACKEND_REPO:-}"
FRONTEND_REPO="${FRONTEND_REPO:-}"

ts="$(date -u +%Y%m%d_%H%M%S)"
LEGACY="/opt/_legacy_${ts}"
mkdir -p "$LEGACY"

need_repo() {
  local name="$1" url="$2"
  if [ -z "$url" ]; then
    echo "ERROR: ${name} repo URL not set. Export ${name}_REPO before running."
    exit 2
  fi
}

need_repo "BACKEND" "$BACKEND_REPO"
need_repo "FRONTEND" "$FRONTEND_REPO"

echo "[1/6] Ensure git installed..."
command -v git >/dev/null

echo "[2/6] Generate deploy key for GitHub (if missing)..."
KEY="/root/.ssh/github_deploy_ed25519"
if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "vps-deploy-key-${ts}" >/dev/null
  chmod 600 "$KEY"
fi
PUB="${KEY}.pub"
echo ">>> Add this PUBLIC key as a Deploy Key (read/write) to BOTH repos:"
cat "$PUB"

echo "[3/6] Configure ssh to use deploy key for github.com..."
SSHCFG="/root/.ssh/config"
touch "$SSHCFG"
chmod 600 "$SSHCFG"
if ! grep -q "Host github.com" "$SSHCFG"; then
  cat >> "$SSHCFG" <<EOF

Host github.com
  IdentityFile ${KEY}
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
fi

echo "[4/6] Convert backend dir into git working tree..."
if [ -d /opt/prime-tech-backend ] && [ ! -d /opt/prime-tech-backend/.git ]; then
  mv /opt/prime-tech-backend "${LEGACY}/prime-tech-backend"
  git clone "$BACKEND_REPO" /opt/prime-tech-backend
  # restore env from legacy
  if [ -f "${LEGACY}/prime-tech-backend/.env" ]; then
    cp "${LEGACY}/prime-tech-backend/.env" /opt/prime-tech-backend/.env
    chmod 600 /opt/prime-tech-backend/.env
  fi
fi

echo "[5/6] Convert frontend dir into git working tree..."
if [ -d /opt/prime-tech-frontend ] && [ ! -d /opt/prime-tech-frontend/.git ]; then
  mv /opt/prime-tech-frontend "${LEGACY}/prime-tech-frontend"
  git clone "$FRONTEND_REPO" /opt/prime-tech-frontend
  # restore env
  if [ -f "${LEGACY}/prime-tech-frontend/.env.local" ]; then
    cp "${LEGACY}/prime-tech-frontend/.env.local" /opt/prime-tech-frontend/.env.local
  fi
fi

echo "[6/6] Build + restart both..."
cd /opt/prime-tech-backend
npm ci
npm run build
pm2 restart 0

cd /opt/prime-tech-frontend
npm ci
npm run build
pm2 restart 1

echo "OK. Legacy copy stored at: ${LEGACY}"