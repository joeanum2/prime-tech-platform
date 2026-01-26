import { prisma } from "../src/db/prisma";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { key: "primetech" },
    update: { name: "Prime Tech Services", status: "ACTIVE" },
    create: { key: "primetech", name: "Prime Tech Services", status: "ACTIVE" },
    select: { id: true, key: true }
  });

  const domains = ["localhost", "127.0.0.1"];

  for (const d of domains) {
    await prisma.tenantDomain.upsert({
      where: { domain: d },
      update: { tenantId: tenant.id, isPrimary: d === "localhost" },
      create: { domain: d, tenantId: tenant.id, isPrimary: d === "localhost" }
    });
  }

  console.log("Seeded tenant:", tenant.key);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
