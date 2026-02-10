export type ServiceItem = {
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
};

export const serviceCatalog: ServiceItem[] = [
  {
    slug: "managed-release",
    name: "Managed Release",
    description: "End-to-end release coordination, QA gates, and deployment support.",
    price: 250000,
    currency: "GBP"
  },
  {
    slug: "licence-compliance",
    name: "Licence Compliance",
    description: "Audit-ready licensing workflows and entitlement mapping.",
    price: 120000,
    currency: "GBP"
  },
  {
    slug: "support-retainer",
    name: "Support Retainer",
    description: "Ongoing support for releases, incident response, and customer queries.",
    price: 80000,
    currency: "GBP"
  }
];
