import { ApiError, apiFetch } from "@/lib/api";
import { getRequestCookiesHeader } from "@/lib/server/cookies";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "STAFF" | "ADMIN";
};

export async function getSession() {
  const cookie = getRequestCookiesHeader();
  try {
    const data = await apiFetch<{ user: SessionUser }>("/api/auth/me", {
      headers: cookie ? { cookie } : undefined
    });
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return { ok: false as const, user: null };
  }
  return { ok: true as const, user };
}
