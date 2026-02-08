"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function AdminUsersClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("User lookup requires backend support.");
  }

  return (
    <div className="space-y-4">
      {message ? <Alert variant="warning">{message}</Alert> : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="User email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Button type="submit">Search user</Button>
      </form>
    </div>
  );
}
