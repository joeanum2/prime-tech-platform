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
    <LayoutShell title="Track booking" description="Use your booking reference and email to view the latest status.">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {!booking || !email ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
            <TrackForm />
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 align-middle" />
            <span className="ml-2 align-middle text-sm text-slate-700">Loading booking…</span>
          </div>
        ) : err ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
            <div className="font-medium text-text">Unable to track booking</div>
            <div className="mt-1 text-sm text-muted">{friendlyError}</div>
          </div>
        ) : data ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
            <div className="text-sm text-muted">Booking reference</div>
            <div className="text-xl font-semibold text-text">{data.bookingRef}</div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted">Status</div>
                <div className="text-lg font-bold text-text">{data.status}</div>
              </div>

              <div>
                <div className="text-sm text-muted">Service</div>
                <div className="font-medium text-text">{data.serviceName ?? "—"}</div>
              </div>

              <div>
                <div className="text-sm text-muted">Preferred date/time</div>
                <div className="font-medium text-text">{fmt(data.preferredDate)}</div>
              </div>

              <div>
                <div className="text-sm text-muted">Booked by</div>
                <div className="font-medium text-text">{data.fullName}</div>
              </div>

              <div>
                <div className="text-sm text-muted">Email</div>
                <div className="font-medium text-text">{data.email}</div>
              </div>

              <div>
                <div className="text-sm text-muted">Created</div>
                <div className="font-medium text-text">{fmt(data.createdAt)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
            Booking not found.
          </div>
        )}
      </div>
    </LayoutShell>
  );
}

