import Link from "next/link";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { getSession } from "@/lib/server/session";

export const metadata = buildMetadata({
  title: "Account",
  description: "Overview of your account, orders, licences, and downloads.",
  path: "/account"
});

export default async function AccountPage() {
  const user = await getSession();
  if (!user) {
    return (
      <LayoutShell title="Account" description="Sign in to view your account.">
        <Alert variant="warning">You must be signed in to view this page.</Alert>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Account" description="Overview of your account activity.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2 p-5">
          <p className="caption">Profile</p>
          <p className="text-lg font-semibold text-text">{user.fullName}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="card space-y-3 p-5">
          <p className="caption">Quick links</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link href="/account/orders" className="text-primary">
              View orders
            </Link>
            <Link href="/account/licences" className="text-primary">
              View licences
            </Link>
            <Link href="/account/downloads" className="text-primary">
              View downloads
            </Link>
            <Link href="/account/settings" className="text-primary">
              Account settings
            </Link>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
