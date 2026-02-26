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

# 1) Remove ALL exported clientFetch declarations/implementations, including:
# - overload signatures: export function clientFetch<T>(...): Promise<T>;
# - implementations: export async function clientFetch(...) { ... }
# - const forms: export const clientFetch = (...) => { ... }
#
# We do this in 3 passes to be robust.

before = s

# A) remove function implementations with a body
s = re.sub(
    r"export\s+(?:async\s+)?function\s+clientFetch\b[\s\S]*?\n\}",
    "",
    s,
    flags=re.S,
)

# B) remove overload signatures / declarations ending with ;
s = re.sub(
    r"export\s+(?:async\s+)?function\s+clientFetch\b[^\n;]*;[ \t]*\n?",
    "",
    s,
    flags=re.M,
)

# C) remove export const clientFetch = ...; or = (...) => { ... }
s = re.sub(
    r"export\s+const\s+clientFetch\b[\s\S]*?;\s*\n",
    "",
    s,
    flags=re.S,
)

removed = len(before) - len(s)

impl = """export async function clientFetch<T = any>(input: string, init: RequestInit = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "https://api.joetechx.co.uk";
  const url = /^https?:\\/\\//i.test(input)
    ? input
    : base + (input.startsWith("/") ? "" : "/") + input;

  const headers = new Headers(init.headers || {});
  // Ensure JSON Content-Type when sending a body
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
    const err: any = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}
"""

# Insert single implementation after the import block (best practice)
m = re.search(r"^(import[\s\S]*?;\s*\n)+", s, flags=re.M)
if m:
    insert_at = m.end()
    s = s[:insert_at] + "\n" + impl + "\n\n" + s[insert_at:]
else:
    s = impl + "\n\n" + s

# Clean excessive blank lines
s = re.sub(r"\n{4,}", "\n\n\n", s).strip() + "\n"

p.write_text(s, encoding="utf-8")
print("Hard reset complete. Removed all exported clientFetch variants and inserted exactly one clean implementation.")
print(f"Net bytes removed/changed: {removed}")
PY

echo
echo "== Rebuild frontend =="
cd "$FRONTEND_DIR"
npm run build

echo
echo "== Restart PM2 (if present) =="
pm2 restart prime-tech-frontend || true
pm2 save || true

echo
echo "== Quick verification (frontend env) =="
if [ -f "$FRONTEND_DIR/.env.production" ]; then
  echo ".env.production present:"
  grep -E 'NEXT_PUBLIC_API_BASE|NEXT_PUBLIC_SITE_URL' "$FRONTEND_DIR/.env.production" || true
fi

echo "DONE."