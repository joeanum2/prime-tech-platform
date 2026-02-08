import type { PrismaClient } from "@prisma/client";
import { isoNow } from "../../lib";

export type AdminStats = {
  ok: true;
  counts: Record<string, number>;
  ts: string;
};

/**
 * Minimal admin stats service.
 * Keep keys stable; add more counters later in Phase 4+.
 */
export async function getAdminStats(prisma: PrismaClient): Promise<AdminStats> {
  // These models may or may not exist depending on your schema.
  // We only count what exists safely.
  const counts: Record<string, number> = {};

  // Helper to safely call prisma.<model>.count() if the model exists
  async function safeCount(modelName: string): Promise<number> {
    const anyPrisma = prisma as any;
    if (!anyPrisma[modelName] || typeof anyPrisma[modelName].count !== "function") return 0;
    return anyPrisma[modelName].count();
  }

  // Common core objects (adjust later once Phase 4 domain expands)
  counts["users"] = await safeCount("user");
  counts["sessions"] = await safeCount("session");
  counts["orders"] = await safeCount("order");
  counts["invoices"] = await safeCount("invoice");
  counts["receipts"] = await safeCount("receipt");
  counts["licences"] = await safeCount("licence");
  counts["releases"] = await safeCount("release");
  counts["bookings"] = await safeCount("booking");

  return { ok: true, counts, ts: isoNow() };
}
