import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";
import { DownloadListClient, DownloadItem } from "@/app/account/downloads/DownloadListClient";

export const metadata = buildMetadata({
  title: "Downloads",
  description: "Access your entitled releases and signed downloads.",
  path: "/account/downloads"
});

export default async function DownloadsPage() {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Downloads" description="Sign in to view downloads.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ releases: DownloadItem[] }>("/api/account/downloads");
    return (
      <LayoutShell title="Downloads" description="Entitled releases with signed URLs.">
        <DownloadListClient items={data.releases ?? []} />
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Downloads" description="Your entitled releases.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
