import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import * as c from "../controllers/admin.controller";
import { adminHealth } from "../controllers/admin.health.controller";
import { adminStats } from "../controllers/admin.stats.controller";
import { adminTestEmail } from "../controllers/admin.email.controller";
import { adminSaveBrandingLogo } from "../controllers/admin.branding.controller";

export const adminRoutes = Router();

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return res.status(500).json({ error: "ADMIN_TOKEN not configured" });

  const auth = req.header("authorization");
  const bearerToken = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  if (bearerToken === adminToken) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

adminRoutes.post("/branding/logo", requireAdminToken, adminSaveBrandingLogo);
adminRoutes.get("/bookings", requireAdminToken, c.adminListBookings);

adminRoutes.use(requireAuth);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/health", adminHealth);
adminRoutes.get("/stats", adminStats);
adminRoutes.patch("/bookings/:bkgRef", c.adminPatchBooking);
adminRoutes.post("/test-email", requireAdminToken, adminTestEmail);
