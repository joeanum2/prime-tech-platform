import { LayoutShell } from "@/components/layout/LayoutShell";
import { Alert } from "@/components/ui/Alert";
import { buildMetadata } from "@/lib/metadata";
import { getSession } from "@/lib/server/session";
import AdminLogoMakerClient from "@/app/admin/logo-maker/AdminLogoMakerClient";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Admin logo maker",
  description: "Create and export logo variants.",
  path: "/admin/logo-maker"
});

export default async function AdminLogoMakerPage() {
  const user = await getSession();
  const adminSignInPath = process.env.NODE_ENV === "production" ? "/admin" : "/admin/dev-login";
  if (!user || user.role !== "ADMIN") {
    return (
      <LayoutShell title="Admin logo maker" description="Restricted area.">
        <Alert variant="error">
          Administrator access required.{" "}
          <Link href={adminSignInPath} className="underline">
            Sign in as admin
          </Link>
          .
        </Alert>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title="Logo maker" description="Create and export SVG/PNG logo variants.">
      <AdminLogoMakerClient />
    </LayoutShell>
  );
}
