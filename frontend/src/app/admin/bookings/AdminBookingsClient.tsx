"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { CanonicalError, clientFetch, getCanonicalError } from "@/lib/api";

export type AdminBookingStatus = "NEW" | "IN_PROGRESS" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const filterStatuses = ["ALL", "NEW", "IN_PROGRESS", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const updateStatuses: AdminBookingStatus[] = ["NEW", "IN_PROGRESS", "CONFIRMED", "COMPLETED", "CANCELLED"];

export type AdminBooking = {
  bookingRef?: string;
  bkgRef?: string;
  status?: AdminBookingStatus;
  fullName?: string;
  email?: string;
  serviceName?: string;
  serviceNameSnapshot?: string;
  preferredAt?: string;
  createdAt?: string;
};

type NormalizedAdminBooking = AdminBooking & {
  bookingRef: string;
  serviceName: string;
};

type AdminBookingsResponse = {
  bookings: AdminBooking[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function normalizeBookings(items: AdminBooking[]): NormalizedAdminBooking[] {
  return items
    .map((item) => ({
      ...item,
      bookingRef: (item.bookingRef ?? item.bkgRef ?? "").trim(),
      serviceName: item.serviceName ?? item.serviceNameSnapshot ?? ""
    }))
    .filter((item): item is NormalizedAdminBooking => item.bookingRef.length > 0);
}

export function AdminBookingsClient() {
  const [bookings, setBookings] = useState<NormalizedAdminBooking[]>([]);
  const [filterStatus, setFilterStatus] = useState<(typeof filterStatuses)[number]>("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<AdminBookingStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingRef, setUpdatingRef] = useState<string | null>(null);
  const [error, setError] = useState<CanonicalError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterDate) params.set("date", filterDate);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const data = await clientFetch<AdminBookingsResponse>(`/api/admin/bookings?${params.toString()}`);
      setBookings(normalizeBookings(data.bookings ?? []));
      setPage(data.page ?? page);
      setPageSize(data.pageSize ?? pageSize);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(getCanonicalError(err));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterDate, pageSize]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const selectedBooking = useMemo(
    () => (selectedRef ? bookings.find((booking) => booking.bookingRef === selectedRef) ?? null : null),
    [bookings, selectedRef]
  );

  async function handleUpdate() {
    if (!selectedRef || !nextStatus) return;

    const previousStatus = selectedBooking?.status;

    setError(null);
    setMessage(null);
    setIsUpdating(true);
    setUpdatingRef(selectedRef);
    setBookings((prev) => prev.map((b) => (b.bookingRef === selectedRef ? { ...b, status: nextStatus } : b)));

    try {
      await clientFetch(`/api/admin/bookings/${encodeURIComponent(selectedRef)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage("Booking status updated.");
      setSelectedRef(null);
      setNextStatus("");
      void loadBookings();
    } catch (err) {
      setBookings((prev) => prev.map((b) => (b.bookingRef === selectedRef ? { ...b, status: previousStatus } : b)));
      setError(getCanonicalError(err));
    } finally {
      setIsUpdating(false);
      setUpdatingRef(null);
    }
  }

  const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = total === 0 ? 0 : Math.min(total, showingStart + bookings.length - 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Select
          label="Filter by status"
          name="status"
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value as (typeof filterStatuses)[number])}
        >
          {filterStatuses.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "All statuses" : status}
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
        <Select
          label="Rows per page"
          name="pageSize"
          value={String(pageSize)}
          onChange={(event) => setPageSize(Number(event.target.value))}
        >
          {[10, 20, 50, 100].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {loading ? "Loading bookings..." : `Showing ${showingStart}-${showingEnd} of ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <ErrorPresenter error={error} /> : null}

      {bookings.length === 0 && !loading ? (
        <Alert variant="info">No bookings match the selected filters.</Alert>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.bookingRef} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-muted">{booking.bookingRef}</p>
                <p className="text-lg font-semibold text-text">{booking.fullName ?? "Customer"}</p>
                <p className="text-sm text-muted">{booking.serviceName || "Service"}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted">{booking.status ?? ""}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isUpdating && updatingRef === booking.bookingRef}
                  onClick={() => {
                    setSelectedRef(booking.bookingRef);
                    setNextStatus(booking.status ?? "");
                  }}
                >
                  Update status
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(selectedRef)} onClose={() => setSelectedRef(null)} title="Update booking status">
        {selectedBooking ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {selectedBooking.bookingRef} - {selectedBooking.fullName}
            </p>
            <Select
              label="New status"
              name="nextStatus"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as AdminBookingStatus | "")}
            >
              <option value="">Select status</option>
              {updateStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelectedRef(null)} disabled={isUpdating}>
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
