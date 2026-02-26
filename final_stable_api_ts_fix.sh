#!/usr/bin/env bash
set -euo pipefail

FRONTEND="/opt/prime-tech-platform/frontend"

if [ ! -d "$FRONTEND" ]; then
  echo "ERROR: frontend not found at $FRONTEND"
  exit 1
fi

API_TS="$FRONTEND/src/lib/api.ts"
cp -a "$API_TS" "$API_TS.bak.$(date +%Y%m%d_%H%M%S)"

cat > "$API_TS" <<'TS'
/* Stable canonical API layer - backward compatible */

export type CanonicalError = {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(input: CanonicalError) {
    super(input.message);
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }
}

function safeParse(text: string): any {
  try { return JSON.parse(text); }
  catch { return text; }
}

export function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (envBase) return envBase.replace(/\/+$/, "");
  return ""; // same-origin fallback
}

export function getCanonicalError(e: unknown): CanonicalError {
  if (e instanceof ApiError) {
    return {
      message: e.message,
      status: e.status,
      code: e.code,
      details: e.details
    };
  }
  if (typeof e === "object" && e && "message" in e) {
    return { message: String((e as any).message) };
  }
  return { message: "Unexpected error" };
}

export async function clientFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {

  const base = getApiBase();
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include"
  });

  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError({
      message:
        data?.error ||
        data?.message ||
        "Request failed",
      status: res.status,
      details: data
    });
  }

  return data as T;
}

/* Backward compatibility alias */
export const apiFetch = clientFetch;
TS

cd "$FRONTEND"
npm ci
npm run build

pm2 restart primetech-frontend || pm2 restart prime-tech-frontend || true
pm2 save || true

echo
echo "Build + restart complete."
echo "Check:"
echo "  https://joetechx.co.uk"
echo "  https://joetechx.co.uk/book"