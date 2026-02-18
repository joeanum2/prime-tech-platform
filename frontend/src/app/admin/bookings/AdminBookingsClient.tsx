"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, CanonicalError } from "@/lib/api";

export type AdminBookingStatus = "NEW" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
type AdminBookingKnownStatus = AdminBookingStatus | "IN_PROGRESS";

export type AdminBooking = {
  bookingRef?: string;
  bkgRef?: string;
  status?: AdminBookingKnownStatus;
  fullName?: string;
  email?: string;
  serviceName?: string;
  serviceNameSnapshot?: string;
  preferredAt?: string;
};

type NormalizedAdminBooking = AdminBooking & {
  bookingRef: string;
  serviceName: string;
};

const statuses: AdminBookingStatus[] = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"];

function normalizeBookings(items: AdminBooking[]): NormalizedAdminBooking[] {
  return items
    .map((item) => ({
      ...item,
      bookingRef: (item.bookingRef ?? item.bkgRef ?? "").trim(),
      serviceName: item.serviceName ?? item.serviceNameSnapshot ?? ""
    }))
    .filter((item): item is NormalizedAdminBooking => item.bookingRef.length > 0);
}

function isUpdatableStatus(value: string): value is AdminBookingStatus {
  return statuses.includes(value as AdminBookingStatus);
}

export function AdminBookingsClient({ items }: { items: AdminBooking[] }) {
  const [bookings, setBookings] = useState<NormalizedAdminBooking[]>(() => normalizeBookings(items));
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selected, setSelected] = useState<NormalizedAdminBooking | null>(null);
  const [nextStatus, setNextStatus] = useState<AdminBookingStatus | "">("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const [error, setError] = useState<CanonicalError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setBookings(normalizeBookings(items));
  }, [items]);

  async function refreshList() {
    try {
      const data = await clientFetch<{ bookings: AdminBooking[] }>("/api/admin/bookings");
      setBookings(normalizeBookings(data.bookings ?? []));
    } catch (err) {
      setError(getCanonicalError(err));
    }
  }

  const filtered = useMemo(() => {
    return bookings.filter((item) => {
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
  }, [bookings, filterStatus, filterDate]);

  async function handleUpdate() {
    const bookingRef = selected?.bookingRef ?? "";
    if (!bookingRef || !nextStatus || !selected) return;

    const previousStatus = selected.status;

    setError(null);
    setMessage(null);
    setIsUpdating(true);
    setUpdatingRef(bookingRef);
    setBookings((prev) => prev.map((b) => (b.bookingRef === bookingRef ? { ...b, status: nextStatus } : b)));

    try {
      await clientFetch(`/api/admin/bookings/${encodeURIComponent(bookingRef)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage("Booking status updated.");
      setSelected(null);
      void refreshList();
    } catch (err) {
      setBookings((prev) => prev.map((b) => (b.bookingRef === bookingRef ? { ...b, status: previousStatus } : b)));
      setError(getCanonicalError(err));
    } finally {
      setIsUpdating(false);
      setUpdatingRef(null);
    }
  }

  if (bookings.length === 0) {
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
          <div key={booking.bookingRef} className="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-muted">{booking.bookingRef}</p>
              <p className="text-lg font-semibold text-text">{booking.fullName ?? "Customer"}</p>
              <p className="text-sm text-muted">{booking.serviceName ?? booking.serviceNameSnapshot ?? "Service"}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted">{booking.status ?? ""}</p>
              <Button
                type="button"
                variant="secondary"
                disabled={isUpdating && updatingRef === booking.bookingRef}
                onClick={() => {
                  setSelected(booking);
                  setNextStatus(booking.status && isUpdatableStatus(booking.status) ? booking.status : "");
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
              {selected.bookingRef ?? selected.bkgRef} — {selected.fullName}
            </p>
            <Select
              label="New status"
              name="nextStatus"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as AdminBookingStatus | "")}
            >
              <option value="">Select status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(null)} disabled={isUpdating}>
                Cancel
              </Button>
              <Button type="button" onClick={handleUpdate} disabled={!nextStatus || isUpdating}>
                Confirm update
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
