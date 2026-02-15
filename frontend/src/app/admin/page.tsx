import { buildMetadata } from "@/lib/metadata";
import AdminDashboardClient from "@/app/admin/AdminDashboardClient";

export const metadata = buildMetadata({
  title: "Admin",
  description: "Admin dashboard",
  path: "/admin"
});

export default function AdminPage() {
  return <AdminDashboardClient />;
}
