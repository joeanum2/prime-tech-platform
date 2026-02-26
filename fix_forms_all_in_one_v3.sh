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
python3 - <<PY
import re
from pathlib import Path

frontend = Path("$FRONTEND_DIR")
p = frontend / "src/lib/api.ts"
if not p.exists():
    raise SystemExit(f"api.ts not found at: {p}")

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

if re.search(r"export\\s+async\\s+function\\s+clientFetch\\s*\\(", s):
    s = re.sub(
        r"export\\s+async\\s+function\\s+clientFetch\\s*\\([^)]*\\)\\s*\\{.*?\\n\\}",
        impl,
        s,
        flags=re.S,
        count=1
    )
else:
    s = s.rstrip() + "\\n\\n" + impl + "\\n"

p.write_text(s, encoding="utf-8")
print("Patched:", p)
PY

echo
echo "== Normalize frontend endpoints using Python (no rg/perl) =="
python3 - <<PY
from pathlib import Path

frontend = Path("$FRONTEND_DIR")
src = frontend / "src"
if not src.exists():
    raise SystemExit(f"src folder not found: {src}")

patterns = [
    ("https://joetechx.co.uk/api/", "/api/"),
    ("http://joetechx.co.uk/api/", "/api/"),
    ("https://api.joetechx.co.uk/api/", "/api/"),
    ("http://api.joetechx.co.uk/api/", "/api/"),
    ('"/booking"', '"/api/bookings"'),
    ("'/booking'", "'/api/bookings'"),
    ('"/bookings"', '"/api/bookings"'),
    ("'/bookings'", "'/api/bookings'"),
]

changed = 0
files = list(src.rglob("*.ts")) + list(src.rglob("*.tsx"))

for f in files:
    text = f.read_text(encoding="utf-8", errors="ignore")
    new = text
    for a, b in patterns:
        new = new.replace(a, b)
    if new != text:
        f.write_text(new, encoding="utf-8")
        changed += 1

print("Updated files:", changed)
PY

echo
echo "== Ensure frontend env has correct API base =="
ENV_PROD="$FRONTEND_DIR/.env.production"
touch "$ENV_PROD"
# Remove existing lines then append canonical values
grep -v '^NEXT_PUBLIC_API_BASE=' "$ENV_PROD" | grep -v '^NEXT_PUBLIC_SITE_URL=' > "$ENV_PROD.tmp" || true
mv "$ENV_PROD.tmp" "$ENV_PROD"
{
  echo "NEXT_PUBLIC_API_BASE=https://api.joetechx.co.uk"
  echo "NEXT_PUBLIC_SITE_URL=https://joetechx.co.uk"
} >> "$ENV_PROD"

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
echo "== Verification (server-side) =="
echo "-- API health --"
curl -i https://api.joetechx.co.uk/api/health | head -n 30

echo
echo "-- Bookings preflight --"
curl -i -X OPTIONS https://api.joetechx.co.uk/api/bookings | head -n 50

echo
echo "DONE."
echo "Now retry in browser: https://joetechx.co.uk/book and https://joetechx.co.uk/contact"
echo "If it still fails, open DevTools > Network and read the failing request's status + response."