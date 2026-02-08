import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { TableShell } from "@/components/ui/Table";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { OrderActions } from "@/app/account/orders/[ordId]/OrderActions";

export const metadata = buildMetadata({
  title: "Order detail",
  description: "Order details, invoices, and receipts.",
  path: "/account/orders"
});

type OrderItem = {
  releaseId?: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
};

type OrderDetail = {
  ordId: string;
  status?: string;
  createdAt?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
  invoice?: { invNumber?: string } | null;
  receipt?: { rcpNumber?: string } | null;
  items?: OrderItem[];
};

export default async function OrderDetailPage({ params }: { params: { ordId: string } }) {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Order detail" description="Sign in to view this order.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ order: OrderDetail }>(`/api/orders/${params.ordId}`);
    const order = data.order;

    return (
      <LayoutShell title={`Order ${order.ordId}`} description="Order details and documents.">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="caption">Order status</p>
                <p className="text-lg font-semibold text-text">{order.status ?? "-"}</p>
              </div>
              {order.status ? <Badge variant="neutral">{order.status}</Badge> : null}
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-3">
              <div>
                <p className="caption">Invoice</p>
                <p>{order.invoice?.invNumber ?? "-"}</p>
              </div>
              <div>
                <p className="caption">Receipt</p>
                <p>{order.receipt?.rcpNumber ?? "-"}</p>
              </div>
              <div>
                <p className="caption">Placed</p>
                <p>{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>

          {order.items && order.items.length > 0 ? (
            <TableShell>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${item.releaseId ?? "item"}-${index}`}>
                      <td>{item.releaseId ?? "Release"}</td>
                      <td>{item.quantity ?? "-"}</td>
                      <td>{formatCurrency(item.unitPrice ?? 0, item.currency ?? order.currency ?? "GBP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableShell>
          ) : null}

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-text">Documents</h3>
            <p className="mt-1 text-sm text-muted">Signed URLs are generated on demand.</p>
            <div className="mt-4">
              <OrderActions invNumber={order.invoice?.invNumber} rcpNumber={order.receipt?.rcpNumber} />
            </div>
          </div>
        </div>
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Order detail" description="Order details.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
