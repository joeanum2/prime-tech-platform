#!/usr/bin/env bash
set -euo pipefail

# --- Detect frontend directory ---
CANDIDATES=(
  "/opt/prime-tech-platform/frontend"
  "/opt/prime-tech-frontend"
  "/var/www/vhosts/*/httpdocs"   # fallback (rare for Next+PM2, but safe to scan)
)

FRONTEND_DIR=""
for c in "${CANDIDATES[@]}"; do
  for d in $c; do
    if [ -f "$d/package.json" ] && [ -d "$d/src" ]; then
      # Heuristic: Next.js app
      if grep -q '"next"' "$d/package.json" 2>/dev/null; then
        FRONTEND_DIR="$d"
        break 2
      fi
    fi
  done
done

if [ -z "${FRONTEND_DIR}" ]; then
  echo "ERROR: Could not detect frontend directory containing Next.js package.json."
  exit 1
fi

API_TS="${FRONTEND_DIR}/src/lib/api.ts"
if [ ! -f "$API_TS" ]; then
  echo "ERROR: api.ts not found at: $API_TS"
  exit 1
fi

stamp(){ date +"%Y%m%d_%H%M%S"; }

echo "Frontend: ${FRONTEND_DIR}"
echo "api.ts:   ${API_TS}"

# --- Backup ---
BACKUP="${API_TS}.bak.$(stamp)"
cp -a "$API_TS" "$BACKUP"
echo "Backup created: $BACKUP"

# --- Write a clean canonical api.ts (single clientFetch; no duplicates) ---
cat > "$API_TS" <<'TS'
/**
 * Canonical API client for Prime Tech Platform frontend.
 * - Ensures a single clientFetch implementation (prevents duplicate definitions).
 * - Uses NEXT_PUBLIC_API_BASE when set; otherwise falls back to same-origin.
 */

export type CanonicalError = {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
};

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  // Same-origin fallback: lets /api/* work if nginx proxies it (recommended)
  return "";
}

export async function clientFetch<T = unknown>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const apiBase = getApiBase();
  const url =
    path.startsWith("http")
      ? path
      : `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 20000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      credentials: "include"
    });

    const text = await res.text();
    const data = text ? safeJsonParse(text) : null;

    if (!res.ok) {
      const err: CanonicalError = {
        message:
          (typeof data === "object" && data && "error" in (data as any) && String((data as any).error)) ||
          (typeof data === "object" && data && "message" in (data as any) && String((data as any).message)) ||
          `Request failed`,
        status: res.status,
        details: data
      };
      throw err;
    }

    return data as T;
  } catch (e: any) {
    // Normalise network/abort errors
    if (e?.name === "AbortError") {
      throw { message: "Request timed out", code: "TIMEOUT" } satisfies CanonicalError;
    }
    if (typeof e === "object" && e && "message" in e) {
      throw e as CanonicalError;
    }
    throw { message: "Network error. Please retry.", code: "NETWORK" } satisfies CanonicalError;
  } finally {
    clearTimeout(t);
  }
}
TS

echo "Rewrote api.ts with canonical implementation."

# --- Build & restart ---
cd "$FRONTEND_DIR"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

npm run build

# Restart PM2 (try common names)
if pm2 describe primetech-frontend >/dev/null 2>&1; then
  pm2 restart primetech-frontend
elif pm2 describe prime-tech-frontend >/dev/null 2>&1; then
  pm2 restart prime-tech-frontend
else
  echo "WARN: Could not find a known PM2 frontend process name. Listing PM2:"
  pm2 ls || true
fi

pm2 save || true

echo
echo "== Quick checks =="
echo "-- Frontend responds (expect 200/302):"
curl -sS -I https://joetechx.co.uk/ | head -n 5 || true

echo "-- API health (expect 200 if proxy configured, otherwise may be 404):"
curl -sS -I https://joetechx.co.uk/api/health | head -n 10 || true

echo
echo "DONE."