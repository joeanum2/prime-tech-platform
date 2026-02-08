"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { TrackForm } from "@/app/track/TrackForm";
import { clientFetch, getCanonicalError, type CanonicalError } from "@/lib/api";

type BookingDetails = {
  bkgRef: string;
  status: string;
  serviceNameSnapshot: string | null;
  preferredAt: string;
  createdAt?: string | null;
};

type TrackResponse = { booking: BookingDetails };

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
          `/api/bookings/track?booking=${encodeURIComponent(booking)}&email=${encodeURIComponent(email)}`
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

  const errText =
    (typeof err === "string" && err) ||
    (err && typeof err === "object" && "detail" in err && typeof (err as any).detail === "string"
      ? (err as any).detail
      : "") ||
    (err && typeof err === "object" && "title" in err && typeof (err as any).title === "string"
      ? (err as any).title
      : "") ||
    (err && typeof err === "object" && "error" in err && typeof (err as any).error === "string"
      ? (err as any).error
      : "") ||
    "An unexpected error occurred.";
  return (
    <LayoutShell>
      <div className="mx-auto w-full max-w-2xl p-4">
        <h1 className="text-2xl font-semibold">Track booking</h1>

        {!booking || !email ? (
          <div className="mt-4">
            <TrackForm />
          </div>
        ) : loading ? (
          <div className="mt-4 rounded-lg border p-4">Loading…</div>
        ) : err ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="font-medium">Unable to load booking</div>
            <div className="mt-1 text-sm text-gray-600">{errText}</div>
          </div>
        ) : data ? (
          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm text-gray-600">Booking reference</div>
            <div className="text-lg font-semibold">{data.bkgRef}</div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="font-medium">{data.status}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Service</div>
                <div className="font-medium">{data.serviceNameSnapshot ?? "—"}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Preferred date/time</div>
                <div className="font-medium">{fmt(data.preferredAt)}</div>
              </div>

              {data.createdAt ? (
                <div>
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="font-medium">{fmt(data.createdAt)}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border p-4">Booking not found.</div>
        )}
      </div>
    </LayoutShell>
  );
}

