import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { AdminOrdersClient, AdminOrder } from "@/app/admin/orders/AdminOrdersClient";

export const metadata = buildMetadata({
  title: "Admin orders",
  description: "Review orders and invoices.",
  path: "/admin/orders"
});

export default async function AdminOrdersPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin orders" description="Restricted area.">
        <Alert variant="error">Administrator access required.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ orders: AdminOrder[] }>("/api/orders");
    return (
      <LayoutShell title="Orders" description="Review order details and invoices.">
        <AdminOrdersClient items={data.orders ?? []} />
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Admin orders" description="Orders overview.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
