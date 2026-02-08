import Link from "next/link";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { TableShell } from "@/components/ui/Table";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { formatDate } from "@/lib/format";

export const metadata = buildMetadata({
  title: "Orders",
  description: "Your orders, invoices, and receipts.",
  path: "/account/orders"
});

type OrderRecord = {
  ordId: string;
  status?: string;
  createdAt?: string;
  invoice?: { invNumber?: string } | null;
  receipt?: { rcpNumber?: string } | null;
};

export default async function AccountOrdersPage() {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Orders" description="Sign in to view your orders.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ orders: OrderRecord[] }>("/api/account/orders");
    return (
      <LayoutShell title="Orders" description="Your order history.">
        <TableShell>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Invoice</th>
                <th>Receipt</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.ordId}>
                  <td>
                    <Link href={`/account/orders/${order.ordId}`} className="font-semibold text-primary">
                      {order.ordId}
                    </Link>
                  </td>
                  <td>
                    {order.status ? <Badge variant="neutral">{order.status}</Badge> : "-"}
                  </td>
                  <td>{order.invoice?.invNumber ?? "-"}</td>
                  <td>{order.receipt?.rcpNumber ?? "-"}</td>
                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Orders" description="Your order history.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
