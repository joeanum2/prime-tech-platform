#!/usr/bin/env bash
set -euo pipefail

ROOT_MONO="/opt/prime-tech-platform"
FE_DIR=""

if [ -d "$ROOT_MONO/frontend" ]; then
  FE_DIR="$ROOT_MONO/frontend"
elif [ -d "/opt/prime-tech-frontend" ]; then
  FE_DIR="/opt/prime-tech-frontend"
else
  echo "ERROR: Cannot find frontend directory."
  echo "Checked: $ROOT_MONO/frontend and /opt/prime-tech-frontend"
  exit 1
fi

API_TS="$FE_DIR/src/lib/api.ts"
if [ ! -f "$API_TS" ]; then
  echo "ERROR: api.ts not found at: $API_TS"
  exit 1
fi

echo "Frontend: $FE_DIR"
echo "api.ts:   $API_TS"
echo

LATEST_BAK="$(ls -1t "$API_TS".bak.* 2>/dev/null | head -n 1 || true)"
if [ -z "${LATEST_BAK}" ]; then
  echo "ERROR: No backup found at $API_TS.bak.*"
  echo "Cannot safely restore automatically."
  exit 1
fi

echo "Restoring api.ts from latest backup:"
echo "  $LATEST_BAK"
cp -a "$LATEST_BAK" "$API_TS"

echo
echo "Rebuilding frontend..."
cd "$FE_DIR"
npm ci
npm run build

echo
echo "Restarting PM2 frontend (if present)..."
pm2 restart prime-tech-frontend >/dev/null 2>&1 || true
pm2 save >/dev/null 2>&1 || true

echo
echo "DONE: Frontend restored + rebuilt. Site should be back up."