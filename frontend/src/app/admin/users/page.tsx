import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { getSession } from "@/lib/server/session";
import { AdminUsersClient } from "@/app/admin/users/AdminUsersClient";

export const metadata = buildMetadata({
  title: "Admin users",
  description: "Lookup and manage users.",
  path: "/admin/users"
});

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin users" description="Restricted area.">
        <Alert variant="error">Administrator access required.</Alert>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Users" description="Search and manage user access.">
      <AdminUsersClient />
    </LayoutShell>
  );
}
