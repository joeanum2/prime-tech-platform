"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

export function SettingsForm({ email }: { email: string }) {
  const [value, setValue] = useState(email);
  const [error, setError] = useState<CanonicalError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await clientFetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value })
      });
      setMessage("Password reset link sent if the account exists.");
    } catch (err) {
      setError(getCanonicalError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRequestReset} className="space-y-4">
      <Input
        label="Account email"
        name="email"
        type="email"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
      />
      {error ? <ErrorPresenter error={error} /> : null}
      {message ? <Alert variant="success">{message}</Alert> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Request password reset"}
      </Button>
    </form>
  );
}
