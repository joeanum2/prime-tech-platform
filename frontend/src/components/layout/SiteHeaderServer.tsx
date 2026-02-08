import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSession } from "@/lib/server/session";

export async function SiteHeaderServer() {
  const user = await getSession();
  return <SiteHeader user={user} />;
}
