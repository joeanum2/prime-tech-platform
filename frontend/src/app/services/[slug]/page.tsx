import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { buildMetadata } from "@/lib/metadata";
import { services } from "@/data/services";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const service = services.find((item) => item.slug === params.slug);
  if (!service) return buildMetadata({ title: "Service", description: "Service details." });
  return buildMetadata({
    title: service.name,
    description: service.summary,
    path: `/services/${service.slug}`
  });
}

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = services.find((item) => item.slug === params.slug);
  if (!service) return notFound();

  return (
    <LayoutShell title={service.name} description={service.summary}>
      <div className="mb-6 space-y-2 text-sm text-muted">
        <Link href="/services" className="text-primary">
          ← Back to services
        </Link>
        <p>Services / {service.name}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-semibold text-text">What is included</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {service.inclusions.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </Card>
        <div className="card space-y-3 p-5">
          <p className="caption">Price guidance</p>
          <p className="text-xl font-semibold text-text">{service.priceGuidance}</p>
          <p className="text-sm text-muted">
            Pricing varies by scope and release complexity. We confirm final pricing after a
            short intake call.
          </p>
          <Link href={`/book?service=${service.slug}`} className={buttonClasses({ variant: "primary" })}>
            Book this service
          </Link>
        </div>
      </div>
    </LayoutShell>
  );
}
