"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

type PdfResponse = { url?: string } | { bucket?: string; objectKey?: string; url?: string };

export function OrderActions({
  invNumber,
  rcpNumber
}: {
  invNumber?: string | null;
  rcpNumber?: string | null;
}) {
  const [error, setError] = useState<CanonicalError | null>(null);
  const [loading, setLoading] = useState(false);

  async function openPdf(path: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch<PdfResponse>(path, { method: "POST" });
      const url = res.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(getCanonicalError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <ErrorPresenter error={error} /> : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!invNumber || loading}
          onClick={() => invNumber && openPdf(`/api/invoices/${invNumber}/pdf`)}
        >
          View invoice PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!rcpNumber || loading}
          onClick={() => rcpNumber && openPdf(`/api/receipts/${rcpNumber}/pdf`)}
        >
          View receipt PDF
        </Button>
      </div>
    </div>
  );
}
