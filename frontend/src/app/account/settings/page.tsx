import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { getSession } from "@/lib/server/session";
import { SettingsForm } from "@/app/account/settings/SettingsForm";

export const metadata = buildMetadata({
  title: "Settings",
  description: "Manage your account settings and security preferences.",
  path: "/account/settings"
});

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Settings" description="Sign in to manage settings.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Settings" description="Account security and preferences.">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5">
          <h3 className="text-lg font-semibold text-text">Change password</h3>
          <p className="mt-2 text-sm text-muted">
            Request a reset link to update your password.
          </p>
          <div className="mt-4">
            <SettingsForm email={user.email} />
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <h3 className="text-lg font-semibold text-text">Email preferences</h3>
          <p className="text-sm text-muted">
            Preference management is handled through your account manager.
          </p>
          <p className="text-xs text-muted">Security info is always available in your account.</p>
        </div>
      </div>
    </LayoutShell>
  );
}
