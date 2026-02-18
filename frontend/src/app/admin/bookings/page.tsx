import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { AdminBookingsClient, AdminBooking } from "@/app/admin/bookings/AdminBookingsClient";

export const metadata = buildMetadata({
  title: "Admin bookings",
  description: "Manage booking status and details.",
  path: "/admin/bookings"
});

export default async function AdminBookingsPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin bookings" description="Restricted area.">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
          <Alert variant="error">Administrator access required.</Alert>
        </div>
      </LayoutShell>
    );
  }

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN?.trim();
  if (!adminToken) {
    return (
      <LayoutShell title="Admin bookings" description="Bookings overview.">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
          <Alert variant="error">
            Admin token missing. Add this to <code>frontend/.env.local</code>:
            <br />
            <code>NEXT_PUBLIC_API_BASE=http://localhost:4000</code>
            <br />
            <code>NEXT_PUBLIC_ADMIN_TOKEN=REPLACE_WITH_BACKEND_ADMIN_TOKEN</code>
          </Alert>
        </div>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ bookings: AdminBooking[] }>("/api/admin/bookings", {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    return (
      <LayoutShell title="Bookings" description="Filter, review, and update bookings.">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
          <AdminBookingsClient items={data.bookings ?? []} />
        </div>
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Admin bookings" description="Bookings overview.">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
          <ErrorPresenter error={getCanonicalError(error)} />
        </div>
      </LayoutShell>
    );
  }
}
