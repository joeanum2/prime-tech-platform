"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminToken, getAdminToken } from "@/lib/adminAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState(getAdminToken() ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Please paste your admin token.");
      return;
    }

    setAdminToken(token);
    router.push("/admin");
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Admin Login</h1>

      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Paste your ADMIN_TOKEN below to access admin tools.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
        <textarea
          rows={6}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
            fontFamily: "monospace"
          }}
        />

        {error && (
          <p style={{ color: "crimson", marginTop: 10 }}>{error}</p>
        )}

        <button
          type="submit"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
