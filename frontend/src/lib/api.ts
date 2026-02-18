import { getAdminToken } from "@/lib/adminAuth";

export type CanonicalError = {
  error: {
    code: string;
    message: string;
    details?: {
      fieldErrors?: Record<string, string[]>;
      meta?: Record<string, unknown>;
    };
  };
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CanonicalError; status: number };

const DEFAULT_TIMEOUT_MS = 10000;
const ADMIN_API_PATH = /^\/api\/admin(?:\/|$)/;
const ADMIN_TOKEN_MISSING_MESSAGE =
  "Missing admin token for admin API calls. Add the following to frontend/.env.local: NEXT_PUBLIC_API_BASE=http://localhost:4000 and NEXT_PUBLIC_ADMIN_TOKEN=REPLACE_WITH_BACKEND_ADMIN_TOKEN.";

function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE is not configured");
  }
  return base.replace(/\/$/, "");
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { controller, timer };
}

function normalizeError(payload: unknown, status: number): CanonicalError {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as CanonicalError).error;
    if (err && typeof err.code === "string" && typeof err.message === "string") {
      return payload as CanonicalError;
    }
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    const msg = String((payload as { error?: string }).error ?? "Request failed");
    return { error: { code: "API_ERROR", message: msg, details: { meta: { status } } } };
  }
  return { error: { code: "API_ERROR", message: "Request failed", details: { meta: { status } } } };
}

export class ApiError extends Error {
  status: number;
  error: CanonicalError;

  constructor(status: number, error: CanonicalError) {
    super(error.error.message || "Request failed");
    this.status = status;
    this.error = error;
  }
}

export function getCanonicalError(error: unknown): CanonicalError {
  if (error instanceof ApiError) {
    return error.error;
  }
  if (error && typeof error === "object" && "error" in error) {
    return error as CanonicalError;
  }
  return {
    error: {
      code: "NETWORK_ERROR",
      message: "Network error. Please retry.",
      details: { meta: { error: error instanceof Error ? error.message : String(error) } }
    }
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const status = res.status;
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    throw new ApiError(status, normalizeError(payload, status));
  }
  return payload as T;
}

function buildNetworkError(error: unknown) {
  return new ApiError(0, {
    error: {
      code: "NETWORK_ERROR",
      message: "Network error. Please retry.",
      details: { meta: { error: error instanceof Error ? error.message : String(error) } }
    }
  });
}

function assertAdminAuth(path: string, headers: Headers) {
  if (!ADMIN_API_PATH.test(path)) return;
  if (headers.has("Authorization")) return;

  throw new ApiError(400, {
    error: {
      code: "ADMIN_TOKEN_MISSING",
      message: ADMIN_TOKEN_MISSING_MESSAGE
    }
  });
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const credentials = init.credentials ?? "include";
  const { controller, timer } = withTimeout(init.signal ?? undefined, DEFAULT_TIMEOUT_MS);
  const token = getAdminToken();
  const headers = new Headers(init.headers ?? undefined);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  assertAdminAuth(path, headers);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials,
      signal: controller.signal,
      cache: "no-store"
    });
    return await handleResponse<T>(res);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw buildNetworkError(error);
  } finally {
    clearTimeout(timer);
  }
}

export async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const { controller, timer } = withTimeout(init.signal ?? undefined, DEFAULT_TIMEOUT_MS);
  const token = getAdminToken();
  const headers = new Headers(init.headers ?? undefined);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  assertAdminAuth(path, headers);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal
    });
    return await handleResponse<T>(res);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw buildNetworkError(error);
  } finally {
    clearTimeout(timer);
  }
}
