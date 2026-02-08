"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

export type AdminBooking = {
  bkgRef: string;
  status?: string;
  fullName?: string;
  email?: string;
  serviceNameSnapshot?: string;
  preferredAt?: string;
};

const statuses = ["NEW", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function AdminBookingsClient({ items }: { items: AdminBooking[] }) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [error, setError] = useState<CanonicalError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterDate) {
        if (!item.preferredAt) return false;
        const iso = new Date(item.preferredAt);
        if (Number.isNaN(iso.getTime())) return false;
        const dateStr = iso.toISOString().slice(0, 10);
        if (dateStr !== filterDate) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterDate]);

  async function handleUpdate() {
    if (!selected || !nextStatus) return;
    setError(null);
    setMessage(null);
    try {
      await clientFetch(`/api/admin/bookings/${selected.bkgRef}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage("Booking status updated.");
      setSelected(null);
    } catch (err) {
      setError(getCanonicalError(err));
    }
  }

  if (items.length === 0) {
    return <Alert variant="info">No bookings available.</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Filter by status"
          name="status"
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Input
          label="Filter by date"
          name="date"
          type="date"
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
        />
      </div>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <ErrorPresenter error={error} /> : null}

      <div className="space-y-3">
        {filtered.map((booking) => (
          <div key={booking.bkgRef} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-muted">{booking.bkgRef}</p>
              <p className="text-lg font-semibold text-text">{booking.fullName ?? "Customer"}</p>
              <p className="text-sm text-muted">{booking.serviceNameSnapshot ?? "Service"}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted">{booking.status ?? ""}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelected(booking);
                  setNextStatus(booking.status ?? "");
                }}
              >
                Update status
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Update booking status">
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {selected.bkgRef} — {selected.fullName}
            </p>
            <Select
              label="New status"
              name="nextStatus"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
            >
              <option value="">Select status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdate} disabled={!nextStatus}>
                Confirm update
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
