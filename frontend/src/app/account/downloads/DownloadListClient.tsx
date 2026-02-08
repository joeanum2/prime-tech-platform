"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

export type DownloadItem = {
  id: string;
  title?: string;
  version?: string;
  filename?: string;
  size?: number;
  releaseNotes?: string;
};

type SignedUrlResponse = {
  url?: string;
};

function formatSize(bytes?: number) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function DownloadListClient({ items }: { items: DownloadItem[] }) {
  const [error, setError] = useState<CanonicalError | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function requestUrl(releaseId: string, retry = false): Promise<string | null> {
    try {
      const res = await clientFetch<SignedUrlResponse>(
        `/api/account/downloads/${releaseId}/signed-url`,
        { method: "POST" }
      );
      return res.url ?? null;
    } catch (err) {
      const canon = getCanonicalError(err);
      const code = canon.error.code ?? "";
      const msg = canon.error.message ?? "";
      if (!retry && (code.includes("EXPIRED") || msg.toLowerCase().includes("expired"))) {
        return requestUrl(releaseId, true);
      }
      if (code.includes("LICENCE")) {
        setMessage("Licence validation failed. Please check your licence status.");
      }
      setError(canon);
      return null;
    }
  }

  async function handleDownload(releaseId: string) {
    setError(null);
    setMessage(null);
    setLoadingId(releaseId);
    const url = await requestUrl(releaseId);
    setLoadingId(null);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  if (items.length === 0) {
    return <Alert variant="info">No downloads are available yet.</Alert>;
  }

  return (
    <div className="space-y-4">
      {message ? <Alert variant="warning">{message}</Alert> : null}
      {error ? <ErrorPresenter error={error} /> : null}
      <div className="grid gap-4">
        {items.map((item) => {
          const sizeLabel = formatSize(item.size);
          return (
            <div key={item.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-lg font-semibold text-text">{item.title ?? "Release"}</p>
                <p className="text-sm text-muted">
                  {item.version ? `Version ${item.version}` : "Version info unavailable"}
                  {sizeLabel ? ` • ${sizeLabel}` : ""}
                </p>
                {item.releaseNotes ? (
                  <p className="mt-2 text-sm text-muted">{item.releaseNotes}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">{item.filename ?? "Download"}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingId === item.id}
                  onClick={() => handleDownload(item.id)}
                >
                  {loadingId === item.id ? "Preparing…" : "Download"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
