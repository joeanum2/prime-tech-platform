"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DevAdminLoginClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignIn() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" }
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Sign in failed");
      }

      window.location.assign("/admin/logo-maker");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={onSignIn} disabled={loading}>
        {loading ? "Signing in..." : "Sign in as Admin (dev)"}
      </Button>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  );
}
