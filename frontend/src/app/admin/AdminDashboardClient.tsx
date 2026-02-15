"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { clientFetch, getCanonicalError } from "@/lib/api";
import { hasAdminToken } from "@/lib/adminAuth";

type AdminStats = {
  users: number;
  orders: number;
  bookings: number;
  releases: number;
};

export default function AdminDashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAdminToken()) {
      router.replace("/admin/login");
      return;
    }

    let active = true;
    clientFetch<AdminStats>("/api/admin/stats")
      .then((next) => {
        if (active) setData(next);
      })
      .catch((e) => {
        if (!active) return;
        const ce = getCanonicalError(e);
        setError(ce.error.message || "Failed to load admin stats");
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <LayoutShell title="Admin dashboard" description="Overview">
      {error ? (
        <Alert title="Error" variant="error">
          {error}
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">Users: {data?.users ?? 0}</div>
            <div className="rounded-2xl border border-border p-4">Orders: {data?.orders ?? 0}</div>
            <div className="rounded-2xl border border-border p-4">Bookings: {data?.bookings ?? 0}</div>
            <div className="rounded-2xl border border-border p-4">Releases: {data?.releases ?? 0}</div>
          </div>

          <div className="mt-6 rounded-2xl border border-border p-4">
            <div className="mb-2 text-sm font-semibold text-text">Tools</div>
            <Link href="/admin/logo-maker" className="text-sm text-primary underline-offset-4 hover:underline">
              Open Logo Maker
            </Link>
            {process.env.NODE_ENV !== "production" ? (
              <div className="mt-2">
                <Link href="/admin/dev-login" className="text-sm text-primary underline-offset-4 hover:underline">
                  Dev Admin Login
                </Link>
              </div>
            ) : null}
          </div>
        </>
      )}
    </LayoutShell>
  );
}
