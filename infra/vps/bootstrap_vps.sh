#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/root/prime-tech-runlogs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/bootstrap_$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "== PrimeTech VPS bootstrap starting at $(date -u) =="

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root."
    exit 1
  fi
}

require_root

install_base_packages() {
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release unzip rsync software-properties-common
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker already installed; skipping Docker install."
  else
    echo "Installing Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
      > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
  fi
}

install_node_pm2() {
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2
  fi
}

install_postgresql_if_missing() {
  if ! command -v psql >/dev/null 2>&1; then
    apt-get install -y postgresql postgresql-contrib postgresql-client
    systemctl enable --now postgresql
  fi
}

create_directories() {
  mkdir -p /opt/prime-tech-backend /opt/prime-tech-frontend
}

main() {
  install_base_packages
  install_docker_if_missing
  install_node_pm2
  install_postgresql_if_missing
  create_directories
  echo "Bootstrap complete."
}

main
