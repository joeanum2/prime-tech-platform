#!/usr/bin/env bash
set -euo pipefail

echo "== Detect repo layout =="
ROOT_MONO="/opt/prime-tech-platform"
FE_A="/opt/prime-tech-frontend"
BE_A="/opt/prime-tech-backend"

FRONTEND_DIR=""
BACKEND_DIR=""

if [ -d "$ROOT_MONO/frontend" ] && [ -d "$ROOT_MONO/backend" ]; then
  FRONTEND_DIR="$ROOT_MONO/frontend"
  BACKEND_DIR="$ROOT_MONO/backend"
elif [ -d "$FE_A" ] && [ -d "$BE_A" ]; then
  FRONTEND_DIR="$FE_A"
  BACKEND_DIR="$BE_A"
else
  echo "ERROR: Cannot find repo folders."
  echo "Checked: $ROOT_MONO/{frontend,backend} and $FE_A + $BE_A"
  exit 1
fi

echo "FRONTEND_DIR=$FRONTEND_DIR"
echo "BACKEND_DIR=$BACKEND_DIR"

API_LIB="$FRONTEND_DIR/src/lib/api.ts"
echo
echo "== Restore api.ts from latest backup (if present) =="
if ls "$API_LIB".bak.* >/dev/null 2>&1; then
  LATEST_BAK="$(ls -t "$API_LIB".bak.* | head -n 1)"
  echo "Restoring: $LATEST_BAK -> $API_LIB"
  cp -a "$LATEST_BAK" "$API_LIB"
else
  echo "No api.ts backup files found. Proceeding without restore."
fi

echo
echo "== Patch clientFetch safely (no shell-expanded template literals) =="
python3 - <<'PY'
import re
from pathlib import Path

p = Path("/opt/prime-tech-platform/frontend/src/lib/api.ts")
if not p.exists():
    # fall back to non-monorepo layout if needed
    alt = Path("/opt/prime-tech-frontend/src/lib/api.ts")
    if alt.exists():
        p = alt
    else:
        raise SystemExit("api.ts not found in expected locations")

s = p.read_text(encoding="utf-8")

impl = """export async function clientFetch(input: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE || "https://api.joetechx.co.uk";
  const url = /^https?:\\/\\//i.test(input)
    ? input
    : base + (input.startsWith("/") ? "" : "/") + input;

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";

  let data: any = text || null;
  if (contentType.includes("application/json") && text) {
    try { data = JSON.parse(text); } catch { /* ignore */ }
  }

  if (!res.ok) {
    const err: any = new Error("HTTP " + res.status + " " + res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}"""

# Replace existing clientFetch if present, else append
if re.search(r"export\s+async\s+function\s+clientFetch\s*\(", s):
    s = re.sub(
        r"export\s+async\s+function\s+clientFetch\s*\([^)]*\)\s*\{.*?\n\}",
        impl,
        s,
        flags=re.S,
        count=1
    )
else:
    s = s.rstrip() + "\n\n" + impl + "\n"

p.write_text(s, encoding="utf-8")
print("Patched:", p)
PY

echo
echo "== Normalize frontend endpoints (booking/contact) =="
# Replace any "/booking" or "/bookings" string literal with "/api/bookings"
# Replace any absolute joetechx/api host usage back to relative /api/... (clientFetch will prefix correctly)
rg -n --hidden --no-ignore -S '"/booking"|"/bookings"|https?://joetechx\.co\.uk/api|https?://api\.joetechx\.co\.uk/api' "$FRONTEND_DIR" || true

# Safer mass replace across src/ only
find "$FRONTEND_DIR/src" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | xargs -0 perl -0777 -i -pe '
  s#(["'\'''])(?:/booking|/bookings)(["'\'''])#${1}/api/bookings${2}#g;
  s#https?://joetechx\.co\.uk(/api/)#${1}#g;
  s#https?://api\.joetechx\.co\.uk(/api/)#${1}#g;
'

echo
echo "== Rebuild frontend and restart PM2 =="
cd "$FRONTEND_DIR"
npm ci
npm run build

pm2 ls || true
pm2 restart prime-tech-frontend || true
pm2 restart prime-tech-backend || true
pm2 save || true

echo
echo "== Verification =="
echo "-- API health --"
curl -i https://api.joetechx.co.uk/api/health | head -n 30

echo
echo "-- Bookings preflight --"
curl -i -X OPTIONS https://api.joetechx.co.uk/api/bookings | head -n 50

echo
echo "DONE. Retry /book and /contact in browser."
echo "If it still fails, you should now see the real HTTP error (status/body) instead of 'Network error'."