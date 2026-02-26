#!/usr/bin/env bash
set -euo pipefail

ROOT_MONO="/opt/prime-tech-platform"
FE_A="/opt/prime-tech-frontend"

if [ -d "$ROOT_MONO/frontend" ]; then
  FRONTEND_DIR="$ROOT_MONO/frontend"
elif [ -d "$FE_A" ]; then
  FRONTEND_DIR="$FE_A"
else
  echo "ERROR: Cannot find frontend folder."
  exit 1
fi

API_LIB="$FRONTEND_DIR/src/lib/api.ts"
if [ ! -f "$API_LIB" ]; then
  echo "ERROR: api.ts not found at $API_LIB"
  exit 1
fi

TS="$(date +%Y%m%d_%H%M%S)"
cp -a "$API_LIB" "$API_LIB.bak.$TS"
echo "Backup created: $API_LIB.bak.$TS"

python3 - <<PY
import re
from pathlib import Path

p = Path("$API_LIB")
s = p.read_text(encoding="utf-8", errors="ignore")

# Desired single implementation
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
  if (contentType.includes("application/json") and text):
    pass
}"""

# NOTE: We cannot use Python 'and' inside TS template; build the impl properly:
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

# Remove ALL existing clientFetch implementations first (handles duplicates)
pattern = r"export\\s+async\\s+function\\s+clientFetch\\s*\\([^)]*\\)\\s*\\{.*?\\n\\}"
matches = list(re.finditer(pattern, s, flags=re.S))
if not matches:
    raise SystemExit("No exported clientFetch(...) found to clean up.")

s_clean = re.sub(pattern, "", s, flags=re.S)

# Put a single clean implementation near the top (after imports)
m = re.search(r"^(import[\\s\\S]*?;\\s*\\n)+", s_clean, flags=re.M)
if m:
    insert_at = m.end()
    s_clean = s_clean[:insert_at] + "\\n" + impl + "\\n\\n" + s_clean[insert_at:]
else:
    s_clean = impl + "\\n\\n" + s_clean

# Tidy excessive blank lines
s_clean = re.sub(r"\\n{4,}", "\\n\\n\\n", s_clean).strip() + "\\n"

p.write_text(s_clean, encoding="utf-8")
print(f"Removed {len(matches)} clientFetch definitions; inserted 1 clean version.")
PY

echo
echo "== Rebuild frontend =="
cd "$FRONTEND_DIR"
npm run build

echo
echo "== Restart PM2 (if present) =="
pm2 restart prime-tech-frontend || true
pm2 save || true

echo "DONE."