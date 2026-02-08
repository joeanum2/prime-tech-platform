"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { Alert } from "@/components/ui/Alert";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

export type AdminOrder = {
  ordId: string;
  status?: string;
  invoice?: { invNumber?: string } | null;
  receipt?: { rcpNumber?: string } | null;
};

type PdfResponse = { url?: string };

export function AdminOrdersClient({ items }: { items: AdminOrder[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<CanonicalError | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((order) =>
      [order.ordId, order.status, order.invoice?.invNumber, order.receipt?.rcpNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [items, query]);

  async function openPdf(path: string) {
    setError(null);
    try {
      const res = await clientFetch<PdfResponse>(path, { method: "POST" });
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(getCanonicalError(err));
    }
  }

  if (items.length === 0) {
    return <Alert variant="info">No orders available.</Alert>;
  }

  return (
    <div className="space-y-4">
      <Input
        label="Search orders"
        name="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        description="Filter by order, invoice, receipt, or status."
      />
      {error ? <ErrorPresenter error={error} /> : null}
      <div className="space-y-3">
        {filtered.map((order) => (
          <div key={order.ordId} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-muted">{order.ordId}</p>
              <p className="text-sm text-muted">Status: {order.status ?? "-"}</p>
              <p className="text-xs text-muted">Invoice: {order.invoice?.invNumber ?? "-"}</p>
              <p className="text-xs text-muted">Receipt: {order.receipt?.rcpNumber ?? "-"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!order.invoice?.invNumber}
                onClick={() =>
                  order.invoice?.invNumber && openPdf(`/api/invoices/${order.invoice.invNumber}/pdf`)
                }
              >
                Invoice PDF
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!order.receipt?.rcpNumber}
                onClick={() =>
                  order.receipt?.rcpNumber && openPdf(`/api/receipts/${order.receipt.rcpNumber}/pdf`)
                }
              >
                Receipt PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
