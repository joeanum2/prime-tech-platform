#!/usr/bin/env bash
set -Eeuo pipefail

LOG_DIR="/root/prime-tech-runlogs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy_vps_$(date -u +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

export DEBIAN_FRONTEND=noninteractive

BACKEND_DIR="/opt/prime-tech-backend"
FRONTEND_DIR="/opt/prime-tech-frontend"
BACKEND_ARCHIVE="/tmp/prime-tech-backend.zip"
FRONTEND_ARCHIVE="/tmp/prime-tech-frontend.zip"
PM2_CONFIG_SOURCE="/tmp/pm2.ecosystem.config.cjs"
PM2_CONFIG_TARGET="${BACKEND_DIR}/infra/vps/pm2.ecosystem.config.cjs"

require_root() {
  if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    echo "This script must be run as root."
    exit 1
  fi
}

validate_inputs() {
  [ -f "$BACKEND_ARCHIVE" ] || { echo "Missing $BACKEND_ARCHIVE"; exit 1; }
  [ -f "$FRONTEND_ARCHIVE" ] || { echo "Missing $FRONTEND_ARCHIVE"; exit 1; }
}

ensure_packages() {
  apt-get update -y
  apt-get install -y unzip rsync curl
}

unpack_release() {
  local archive="$1"
  local target_dir="$2"
  local temp_dir
  temp_dir="$(mktemp -d)"
  unzip -q "$archive" -d "$temp_dir"
  mkdir -p "$target_dir"
  rsync -a --delete --exclude ".env" --exclude "node_modules" "${temp_dir}/" "${target_dir}/"
  rm -rf "$temp_dir"
}

prepare_pm2_config() {
  if [ -f "$PM2_CONFIG_SOURCE" ]; then
    mkdir -p "$(dirname "$PM2_CONFIG_TARGET")"
    cp "$PM2_CONFIG_SOURCE" "$PM2_CONFIG_TARGET"
  fi
  [ -f "$PM2_CONFIG_TARGET" ] || { echo "Missing PM2 ecosystem config at $PM2_CONFIG_TARGET"; exit 1; }
}

deploy_backend() {
  cd "$BACKEND_DIR"
  npm ci
  npm run prisma:generate
  npx prisma migrate deploy
  npm run build
}

deploy_frontend() {
  cd "$FRONTEND_DIR"
  npm ci
  npm run build
}

restart_pm2() {
  pm2 startOrReload "$PM2_CONFIG_TARGET" --env production
  pm2 save
}

verify_health() {
  local attempts=30
  local delay_seconds=2
  local code="000"
  local i

  for i in $(seq 1 "$attempts"); do
    code="$(curl -s -o /tmp/primetech-health.json -w "%{http_code}" "http://127.0.0.1:4000/api/health" || true)"
    if [ "$code" = "200" ]; then
      echo "Health check passed (HTTP 200)."
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "Health check failed after ${attempts} attempts. Last HTTP ${code}"
  [ -f /tmp/primetech-health.json ] && cat /tmp/primetech-health.json
  exit 1
}

require_root
validate_inputs
ensure_packages
unpack_release "$BACKEND_ARCHIVE" "$BACKEND_DIR"
unpack_release "$FRONTEND_ARCHIVE" "$FRONTEND_DIR"
prepare_pm2_config
deploy_backend
deploy_frontend
restart_pm2
verify_health

echo "deploy_vps.sh completed successfully."
