import { LayoutShell } from "@/components/layout/LayoutShell";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Terms of service",
  description: "Prime Tech Services terms of service.",
  path: "/legal/terms"
});

export default function TermsPage() {
  return (
    <LayoutShell title="Terms of service" description="Service terms and expectations.">
      <div className="space-y-4 text-sm text-muted">
        <p>
          Services are provided under mutually agreed statements of work. Payments and
          licensing must align with issued invoices and receipts.
        </p>
        <p>
          Access to downloads is limited to entitled users and valid licences. Misuse or
          unauthorised distribution is prohibited.
        </p>
        <p>Contact us with any questions before engaging services.</p>
      </div>
    </LayoutShell>
  );
}
