export const ADMIN_TOKEN_KEY = "primetech_admin_token";

export function getAdminToken(): string | null {
  const envToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN?.trim() ?? "";
  if (typeof window === "undefined") {
    return envToken || null;
  }
  const localToken = window.localStorage.getItem(ADMIN_TOKEN_KEY)?.trim() ?? "";
  return localToken || envToken || null;
}

export function setAdminToken(token: string) {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function hasAdminToken(): boolean {
  return !!getAdminToken();
}
