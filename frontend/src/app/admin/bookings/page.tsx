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
        <Alert variant="error">Administrator access required.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ bookings: AdminBooking[] }>("/api/admin/bookings");
    return (
      <LayoutShell title="Bookings" description="Filter, review, and update bookings.">
        <AdminBookingsClient items={data.bookings ?? []} />
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Admin bookings" description="Bookings overview.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
