import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { getSession } from "@/lib/server/session";
import { AdminBookingsClient } from "@/app/admin/bookings/AdminBookingsClient";

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
        <div className="mx-auto w-full max-w-4xl p-5 pt-card sm:p-7">
          <Alert variant="error">Administrator access required.</Alert>
        </div>
      </LayoutShell>
    );
  }

  const adminToken = process.env.NEXT_PUBLIC_ADMIN_TOKEN?.trim();
  if (!adminToken) {
    return (
      <LayoutShell title="Admin bookings" description="Bookings overview.">
        <div className="mx-auto w-full max-w-4xl p-5 pt-card sm:p-7">
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

  return (
    <LayoutShell title="Bookings" description="Filter, review, and update bookings.">
      <div className="mx-auto w-full max-w-4xl p-5 pt-card sm:p-7">
        <AdminBookingsClient />
      </div>
    </LayoutShell>
  );
}
