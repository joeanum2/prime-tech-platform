import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!base) {
    return null;
  }
  return base.replace(/\/$/, "");
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_BASE is not configured" }, { status: 500 });
  }

  const email = "admin@primetech.local";
  const password = process.env.DEV_ADMIN_PASSWORD || "PrimeTechAdmin123!";
  const forwardedHost = req.headers.get("host") || "localhost:3000";

  const upstream = await fetch(`${apiBase}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-host": forwardedHost
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: payload?.error || "Dev admin login failed", details: payload ?? null },
      { status: upstream.status }
    );
  }

  const setCookie = upstream.headers.get("set-cookie");
  if (!setCookie) {
    return NextResponse.json({ error: "Login succeeded but no session cookie was returned" }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("set-cookie", setCookie);
  return res;
}
