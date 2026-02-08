import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { AdminReleasesClient, AdminRelease } from "@/app/admin/releases/AdminReleasesClient";

export const metadata = buildMetadata({
  title: "Admin releases",
  description: "Manage releases and downloads.",
  path: "/admin/releases"
});

export default async function AdminReleasesPage() {
  const user = await getSession();
  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin releases" description="Restricted area.">
        <Alert variant="error">Administrator access required.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ releases: AdminRelease[] }>("/api/releases");
    return (
      <LayoutShell title="Releases" description="Upload and manage release metadata.">
        <AdminReleasesClient items={data.releases ?? []} />
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Admin releases" description="Releases overview.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
