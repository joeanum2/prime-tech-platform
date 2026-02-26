#!/usr/bin/env bash
set -euo pipefail

echo "== Detecting repo layout =="

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
  echo "ERROR: Cannot find repo folders. Checked:"
  echo " - $ROOT_MONO/{frontend,backend}"
  echo " - $FE_A and $BE_A"
  exit 1
fi

echo "FRONTEND_DIR=$FRONTEND_DIR"
echo "BACKEND_DIR=$BACKEND_DIR"

echo
echo "== Frontend env check =="
if [ -f "$FRONTEND_DIR/.env.production" ]; then
  echo "--- $FRONTEND_DIR/.env.production ---"
  sed -n '1,120p' "$FRONTEND_DIR/.env.production"
else
  echo "WARN: .env.production not found in frontend."
fi

echo
echo "== Searching for suspicious API paths in frontend =="
rg -n --hidden --no-ignore -S '"/booking"|"/bookings"|/booking\b|/bookings\b|NEXT_PUBLIC_API_BASE|api\.joetechx|joetechx\.co\.uk/api' "$FRONTEND_DIR" || true

echo
echo "== Patch: ensure API base is used consistently + improve error reporting =="

API_LIB="$FRONTEND_DIR/src/lib/api.ts"
if [ ! -f "$API_LIB" ]; then
  echo "ERROR: Cannot find $API_LIB"
  exit 1
fi

# Create a backup
cp -a "$API_LIB" "$API_LIB.bak.$(date +%Y%m%d_%H%M%S)"

# Replace or inject a safer clientFetch implementation that:
# - prefixes with NEXT_PUBLIC_API_BASE for non-absolute URLs
# - always sets Content-Type for JSON
# - surfaces status + response body on non-2xx
python3 - <<PY
import re, pathlib
p = pathlib.Path("$API_LIB")
s = p.read_text(encoding="utf-8")

# If clientFetch exists, replace its body with a robust implementation.
# If not, append a new function at end.
if "export async function clientFetch" in s:
    s = re.sub(
        r"export async function clientFetch\\([^\\)]*\\)\\s*\\{.*?\\n\\}",
        """export async function clientFetch(input: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE || "https://api.joetechx.co.uk";
  const url = /^https?:\\/\\//i.test(input) ? input : `${base}${input.startsWith("/") ? "" : "/"}${input}`;

  const headers = new Headers(init.headers || {});
  // Default JSON header for POST/PUT/PATCH unless caller set something else
  if (!headers.has("Content-Type") && init.body != null) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") && text ? JSON.parse(text) : (text || null);

  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}""",
        s,
        flags=re.S,
        count=1
    )
else:
    s += """

export async function clientFetch(input: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE || "https://api.joetechx.co.uk";
  const url = /^https?:\\/\\//i.test(input) ? input : `${base}${input.startsWith("/") ? "" : "/"}${input}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body != null) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") && text ? JSON.parse(text) : (text || null);

  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}
"""
p.write_text(s, encoding="utf-8")
print("Patched:", p)
PY

echo
echo "== Patch booking/contact forms to call /api/bookings and /api/contact using clientFetch =="

# These are common locations in your app; we patch safely by search/replace patterns.
# If your files differ, ripgrep output above will reveal exact files.
for f in \
  "$FRONTEND_DIR/src/app/book/page.tsx" \
  "$FRONTEND_DIR/src/app/book/BookForm.tsx" \
  "$FRONTEND_DIR/src/components/booking/BookingForm.tsx" \
  "$FRONTEND_DIR/src/components/forms/BookingForm.tsx" \
  "$FRONTEND_DIR/src/app/contact/page.tsx" \
  "$FRONTEND_DIR/src/components/contact/ContactForm.tsx"
do
  [ -f "$f" ] || continue
  cp -a "$f" "$f.bak.$(date +%Y%m%d_%H%M%S)"

  # Replace any "/booking" with "/api/bookings"
  perl -0777 -i -pe 's#(["'\'''])(?:/booking|/bookings)(["'\'''])#${1}/api/bookings${2}#g' "$f"

  # Replace any "joetechx.co.uk/api/..." with "/api/..." so clientFetch prefixes correctly
  perl -0777 -i -pe 's#https?://joetechx\\.co\\.uk(/api/)#${1}#g' "$f"
  perl -0777 -i -pe 's#https?://api\\.joetechx\\.co\\.uk(/api/)#${1}#g' "$f"

  # Replace contact endpoint if it uses /api/contact or /api/contacts inconsistently (keep /api/contact)
  perl -0777 -i -pe 's#(["'\'''])/api/contacts(["'\'''])#${1}/api/contact${2}#g' "$f"
done

echo
echo "== Rebuild frontend =="
cd "$FRONTEND_DIR"
npm ci
npm run build

echo
echo "== Restart PM2 frontend/backend (best-effort) =="
pm2 ls || true

# Try common process names; ignore if not present.
pm2 restart prime-tech-frontend || true
pm2 restart prime-tech-backend || true
pm2 save || true

echo
echo "== Quick verification =="
echo "-- API health --"
curl -i https://api.joetechx.co.uk/api/health | head -n 20

echo
echo "-- CORS preflight bookings --"
curl -i -X OPTIONS https://api.joetechx.co.uk/api/bookings | head -n 30

echo
echo "DONE. Now retry booking/contact in browser. If it fails, the UI will now show real HTTP status/body."