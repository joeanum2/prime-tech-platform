import { LayoutShell } from "@/components/layout/LayoutShell";
import { buildMetadata } from "@/lib/metadata";
import { ContactForm } from "@/app/contact/ContactForm";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Get in touch with Prime Tech Services.",
  path: "/contact"
});

export default function ContactPage() {
  return (
    <LayoutShell
      title="Contact"
      description="Share your enquiry and we will respond within one business day."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm />
        <div className="card space-y-3 p-5">
          <h3 className="text-lg font-semibold text-text">Contact details</h3>
          <p className="text-sm text-muted">
            We support release planning, licensing, and managed delivery.
          </p>
          <div className="text-sm text-muted">
            <p>Business hours: Monday–Friday</p>
            <p>Response time: within 1 business day</p>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
