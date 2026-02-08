import Link from "next/link";
import { buildMetadata } from "@/lib/metadata";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { services } from "@/data/services";

export const metadata = buildMetadata({
  title: "Prime Tech Services",
  description: "Professional software services and managed releases for modern teams.",
  path: "/"
});

export default function HomePage() {
  return (
    <LayoutShell
      title="Software services built for release confidence"
      description="Clear, reliable support for deployments, licensing, and customer operations."
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card space-y-4 p-6">
          <h2 className="text-2xl font-semibold text-text">Release with calm, not chaos.</h2>
          <p className="text-sm text-muted">
            Prime Tech Services helps teams plan releases, validate licensing, and keep
            customers supported from day one.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/book" className={buttonClasses({ variant: "primary" })}>
              Book a consultation
            </Link>
            <Link href="/services" className={buttonClasses({ variant: "secondary" })}>
              Explore services
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="card p-5">
            <p className="caption">Trust signals</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Operational clarity</h3>
            <p className="text-sm text-muted">
              Clear engagement plans, audit-ready documentation, and dependable delivery.
            </p>
          </div>
          <div className="card p-5">
            <p className="caption">Fast onboarding</p>
            <h3 className="mt-2 text-lg font-semibold text-text">Ready in days, not weeks</h3>
            <p className="text-sm text-muted">
              We align with your workflow and provide a clear next-step roadmap.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Services overview</h2>
          <Link href="/services" className="text-sm font-semibold text-primary">
            View all services
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => (
            <Card key={service.slug}>
              <CardTitle>{service.name}</CardTitle>
              <CardDescription className="mt-2">{service.summary}</CardDescription>
              <CardFooter>
                <span className="text-xs text-muted">{service.priceGuidance}</span>
                <Link href={`/services/${service.slug}`} className="text-sm font-semibold">
                  Details
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </LayoutShell>
  );
}
