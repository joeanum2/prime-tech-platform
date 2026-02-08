"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";

export type AdminRelease = {
  id: string;
  title?: string;
  version?: string;
  slug?: string;
  filename?: string;
};

export function AdminReleasesClient({ items }: { items: AdminRelease[] }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("Release metadata draft captured. Backend submission is required.");
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      {message ? <Alert variant="info">{message}</Alert> : null}
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          Create release metadata
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((release) => (
          <div key={release.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-lg font-semibold text-text">{release.title ?? "Release"}</p>
              <p className="text-sm text-muted">Version: {release.version ?? "-"}</p>
              <p className="text-xs text-muted">Slug: {release.slug ?? "-"}</p>
            </div>
            <p className="text-xs text-muted">{release.filename ?? ""}</p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Release metadata">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" name="title" required />
          <Input label="Version" name="version" required />
          <Input label="Slug" name="slug" required />
          <Input label="Filename" name="filename" required />
          <Alert variant="warning">
            Uploads must be handled by the backend release pipeline. This form captures metadata only.
          </Alert>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save metadata</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
