import { buildMetadata } from "@/lib/metadata";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import Link from "next/link";

type AdminStats = {
  users: number;
  orders: number;
  bookings: number;
  releases: number;
};

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin dashboard",
  path: "/admin"
});

export default async function AdminPage() {
  const user = await getSession();

  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin">
        <Alert title="Access denied" variant="error">
          You do not have permission to view this page.
        </Alert>
      </LayoutShell>
    );
  }

  let data: AdminStats | null = null;
  let error: string | null = null;

  try {
    data = await apiFetch<AdminStats>("/api/admin/stats");
  } catch (e) {
    const ce = getCanonicalError(e);
    error = ce.error.message || "Failed to load admin stats";
  }

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
