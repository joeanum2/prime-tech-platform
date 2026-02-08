import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { TableShell } from "@/components/ui/Table";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { buildMetadata } from "@/lib/metadata";
import { apiFetch, getCanonicalError } from "@/lib/api";
import { getSession } from "@/lib/server/session";

export const metadata = buildMetadata({
  title: "Licences",
  description: "Your licences and activation status.",
  path: "/account/licences"
});

type LicenceRecord = {
  licKey: string;
  status?: string;
  activation?: { id?: string } | null;
};

export default async function LicencesPage() {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Licences" description="Sign in to view licences.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  try {
    const data = await apiFetch<{ licences: LicenceRecord[] }>("/api/licences");
    return (
      <LayoutShell title="Licences" description="Your licence keys and activation status.">
        <TableShell>
          <table>
            <thead>
              <tr>
                <th>Licence</th>
                <th>Status</th>
                <th>Activations</th>
              </tr>
            </thead>
            <tbody>
              {data.licences.map((licence) => (
                <tr key={licence.licKey}>
                  <td className="font-semibold">{licence.licKey}</td>
                  <td>
                    {licence.status ? <Badge variant="neutral">{licence.status}</Badge> : "-"}
                  </td>
                  <td>{licence.activation ? 1 : 0} / 1</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableShell>
        <p className="mt-4 text-sm text-muted">Offline grace details are shown on licence validation.</p>
      </LayoutShell>
    );
  } catch (error) {
    return (
      <LayoutShell title="Licences" description="Your licence entitlements.">
        <ErrorPresenter error={getCanonicalError(error)} />
      </LayoutShell>
    );
  }
}
