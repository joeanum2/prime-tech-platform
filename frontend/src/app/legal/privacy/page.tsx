import { LayoutShell } from "@/components/layout/LayoutShell";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description: "Prime Tech Services privacy policy.",
  path: "/legal/privacy"
});

export default function PrivacyPage() {
  return (
    <LayoutShell title="Privacy policy" description="How we handle your data.">
      <div className="space-y-4 text-sm text-muted">
        <p>
          We collect only the information required to deliver services, manage bookings,
          and provide account access. We do not sell personal data.
        </p>
        <p>
          Session data is stored securely and cookies are used for authentication only.
          Contact data is retained for service delivery and legal obligations.
        </p>
        <p>For questions, contact us via the contact form.</p>
      </div>
    </LayoutShell>
  );
}
