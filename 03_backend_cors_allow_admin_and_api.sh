#!/usr/bin/env bash
set -euo pipefail

BACK_DIR="/opt/prime-tech-backend"
ENV_FILE="${BACK_DIR}/.env"

test -d "$BACK_DIR" || { echo "Missing $BACK_DIR"; exit 1; }
test -f "$ENV_FILE" || { echo "Missing $ENV_FILE"; exit 1; }

echo "[1/3] Ensure CORS_ORIGINS includes www + root + admin..."
# Keep existing values, ensure required ones exist
required=(
  "https://www.joetechx.co.uk"
  "https://joetechx.co.uk"
  "https://admin.joetechx.co.uk"
)

current="$(grep -E '^CORS_ORIGINS=' "$ENV_FILE" | head -n1 | cut -d= -f2- || true)"

if [ -z "$current" ]; then
  new="https://www.joetechx.co.uk,https://joetechx.co.uk,https://admin.joetechx.co.uk"
  echo "CORS_ORIGINS=${new}" >> "$ENV_FILE"
else
  new="$current"
  for r in "${required[@]}"; do
    if [[ ",$new," != *",$r,"* ]]; then
      new="${new},${r}"
    fi
  done
  # rewrite the line
  sed -i "s#^CORS_ORIGINS=.*#CORS_ORIGINS=${new}#g" "$ENV_FILE"
fi

echo "[2/3] Ensure SITE_URL is still correct for tracking..."
if grep -q '^SITE_URL=' "$ENV_FILE"; then
  sed -i 's#^SITE_URL=.*#SITE_URL=https://www.joetechx.co.uk#g' "$ENV_FILE"
else
  echo "SITE_URL=https://www.joetechx.co.uk" >> "$ENV_FILE"
fi

echo "[3/3] Restart backend..."
pm2 restart 0

curl -sSI https://api.joetechx.co.uk/api/health | head -n 5