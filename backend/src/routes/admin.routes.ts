import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth";
import * as c from "../controllers/admin.controller";
import { adminHealth } from "../controllers/admin.health.controller";
import { adminStats } from "../controllers/admin.stats.controller";
import { adminTestEmail } from "../controllers/admin.email.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireRole("ADMIN"));

adminRoutes.get("/health", adminHealth);
adminRoutes.get("/stats", adminStats);
adminRoutes.get("/bookings", c.adminListBookings);
adminRoutes.patch("/bookings/:bkgRef", c.adminPatchBooking);
adminRoutes.post(
  "/test-email",
  (req, res, next) => {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) return res.status(500).json({ error: "ADMIN_TOKEN not configured" });

    const auth = req.header("authorization");
    const xAdmin = req.header("x-admin-token");
    const bearerToken = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

    if (xAdmin === adminToken || bearerToken === adminToken) return next();
    return res.status(401).json({ error: "Not authenticated" });
  },
  adminTestEmail
);
