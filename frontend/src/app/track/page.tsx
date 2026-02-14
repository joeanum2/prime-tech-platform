"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { TrackForm } from "@/app/track/TrackForm";
import { clientFetch, getCanonicalError, type CanonicalError } from "@/lib/api";

type BookingDetails = {
  bookingRef: string;
  status: string;
  serviceName: string | null;
  preferredDate: string;
  fullName: string;
  email: string;
  createdAt: string;
};

type TrackResponse = { ok: true; booking: BookingDetails };

function fmt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

export default function TrackPage() {
  const sp = useSearchParams();

  const booking = useMemo(() => (sp.get("booking") || sp.get("bkgRef") || "").trim(), [sp]);
  const email = useMemo(() => (sp.get("email") || "").trim(), [sp]);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookingDetails | null>(null);
  const [err, setErr] = useState<CanonicalError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!booking || !email) return;

      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await clientFetch<TrackResponse>(
          `/api/track?booking=${encodeURIComponent(booking)}&email=${encodeURIComponent(email)}`
        );

        if (!cancelled) setData(res.booking);
      } catch (e: any) {
        if (!cancelled) setErr(getCanonicalError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [booking, email]);

  const errCode = err?.error?.code ?? "";
  const errMessage = err?.error?.message ?? "An unexpected error occurred.";
  const friendlyError =
    errCode === "BOOKING_NOT_FOUND"
      ? "We could not find a booking for that reference."
      : errCode === "FORBIDDEN"
        ? "The booking reference and email do not match."
        : errMessage;
  return (
    <LayoutShell>
      <div className="mx-auto w-full max-w-2xl p-4">
        <h1 className="text-2xl font-semibold">Track booking</h1>

        {!booking || !email ? (
          <div className="mt-4">
            <TrackForm />
          </div>
        ) : loading ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 align-middle" />
            <span className="ml-2 align-middle">Loading booking…</span>
          </div>
        ) : err ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="font-medium">Unable to track booking</div>
            <div className="mt-1 text-sm text-gray-600">{friendlyError}</div>
          </div>
        ) : data ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm text-gray-600">Booking reference</div>
            <div className="text-lg font-semibold">{data.bookingRef}</div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-xl font-bold">{data.status}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Service</div>
                <div className="font-medium">{data.serviceName ?? "—"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Preferred date/time</div>
                <div className="font-medium">{fmt(data.preferredDate)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Booked by</div>
                <div className="font-medium">{data.fullName}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium">{data.email}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="font-medium">{fmt(data.createdAt)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border p-4">Booking not found.</div>
        )}
      </div>
    </LayoutShell>
  );
}

