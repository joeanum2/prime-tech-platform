import Link from "next/link";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/Card";
import { buildMetadata } from "@/lib/metadata";
import { services } from "@/data/services";

export const metadata = buildMetadata({
  title: "Services",
  description: "Explore Prime Tech Services offerings and release support packages.",
  path: "/services"
});

export default function ServicesPage() {
  return (
    <LayoutShell title="Services" description="Clear, dependable support for your release cycle.">
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service) => (
          <Card key={service.slug}>
            <CardTitle>{service.name}</CardTitle>
            <CardDescription className="mt-2">{service.summary}</CardDescription>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {service.inclusions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <CardFooter>
              <span className="text-xs text-muted">{service.priceGuidance}</span>
              <Link href={`/services/${service.slug}`} className="text-sm font-semibold">
                View details
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </LayoutShell>
  );
}
