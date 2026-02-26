#!/usr/bin/env bash
set -euo pipefail

FRONT_DIR="/opt/prime-tech-frontend"
ENV_FILE="${FRONT_DIR}/.env.local"
API_BASE="https://api.joetechx.co.uk"

test -d "$FRONT_DIR" || { echo "Missing $FRONT_DIR"; exit 1; }

echo "[1/4] Set NEXT_PUBLIC_API_BASE=${API_BASE}..."
mkdir -p "$FRONT_DIR"
touch "$ENV_FILE"

# Replace or add
if grep -q '^NEXT_PUBLIC_API_BASE=' "$ENV_FILE"; then
  sed -i "s#^NEXT_PUBLIC_API_BASE=.*#NEXT_PUBLIC_API_BASE=${API_BASE}#g" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_API_BASE=${API_BASE}" >> "$ENV_FILE"
fi

echo "[2/4] Build frontend..."
cd "$FRONT_DIR"
npm ci
npm run build

echo "[3/4] Restart PM2 frontend (id 1 assumed)..."
pm2 restart 1

echo "[4/4] Verify homepage returns 200..."
curl -sSI https://www.joetechx.co.uk/ | head -n 5