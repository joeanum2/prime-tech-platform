import bcrypt from "bcryptjs";
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

  const adminEmail = "admin@primetech.local";
  const adminPassword = "PrimeTechAdmin123!";
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: { fullName: "Prime Tech Admin", role: "ADMIN", passwordHash },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      fullName: "Prime Tech Admin",
      passwordHash,
      role: "ADMIN"
    },
    select: { id: true, email: true, role: true }
  });

  console.log("Seeded tenant:", tenant.key);
  console.log("Seeded admin user:", adminUser.email, adminUser.role);
  console.log("Admin password:", adminPassword);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
