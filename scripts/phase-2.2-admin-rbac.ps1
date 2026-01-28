$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

$adminHealthPath = Join-Path $repoRoot "backend\src\controllers\admin.health.controller.ts"
$adminStatsPath = Join-Path $repoRoot "backend\src\controllers\admin.stats.controller.ts"
$adminRoutesPath = Join-Path $repoRoot "backend\src\routes\admin.routes.ts"
$appPath = Join-Path $repoRoot "backend\src\app.ts"

$adminHealthContent = @'
import type { Request, Response } from "express";

export function adminHealth(_req: Request, res: Response) {
  return res.json({ ok: true, scope: "admin", ts: new Date().toISOString() });
}
'@

$adminStatsContent = @'
import type { Request, Response } from "express";
import { prisma } from "../db/prisma";

export async function adminStats(req: Request, res: Response) {
  const user = (req as any).user;
  const where = user?.tenantId ? { tenantId: user.tenantId } : undefined;

  const [
    users,
    sessions,
    bookings,
    orders,
    invoices,
    receipts,
    licences,
    releases
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.session.count({ where }),
    prisma.booking.count({ where }),
    prisma.order.count({ where }),
    prisma.invoice.count({ where }),
    prisma.receipt.count({ where }),
    prisma.licence.count({ where }),
    prisma.release.count({ where })
  ]);

  return res.json({
    ok: true,
    counts: { users, sessions, bookings, orders, invoices, receipts, licences, releases },
    ts: new Date().toISOString()
  });
}
'@

$adminRoutesContent = @'
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import * as c from "../controllers/admin.controller";
import { adminHealth } from "../controllers/admin.health.controller";
import { adminStats } from "../controllers/admin.stats.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/health", adminHealth);
adminRoutes.get("/stats", adminStats);
adminRoutes.get("/bookings", c.adminListBookings);
adminRoutes.patch("/bookings/:bkgRef", c.adminPatchBooking);
'@

Set-Content -Path $adminHealthPath -Value $adminHealthContent -Encoding UTF8
Set-Content -Path $adminStatsPath -Value $adminStatsContent -Encoding UTF8
Set-Content -Path $adminRoutesPath -Value $adminRoutesContent -Encoding UTF8

$appContent = Get-Content -Path $appPath -Raw
if ($appContent -notmatch 'app\.use\("/api/admin", adminRoutes\);') {
  $appContent = $appContent -replace 'app\.use\("/api/bookings", bookingsRoutes\);', 'app.use("/api/bookings", bookingsRoutes);`r`n  app.use("/api/admin", adminRoutes);'
  Set-Content -Path $appPath -Value $appContent -Encoding UTF8
}

Write-Output "OK: Phase 2.2 applied"
