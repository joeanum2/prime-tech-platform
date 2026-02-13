import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { DevAdminLoginClient } from "@/app/admin/dev-login/DevAdminLoginClient";

export const metadata = buildMetadata({
  title: "Admin dev login",
  description: "Development-only admin sign-in helper.",
  path: "/admin/dev-login"
});

export default function AdminDevLoginPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <LayoutShell title="Dev login" description="Disabled in production.">
        <Alert variant="warning">This development login helper is disabled in production.</Alert>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Dev login" description="Create an admin session for local development.">
      <DevAdminLoginClient />
    </LayoutShell>
  );
}
