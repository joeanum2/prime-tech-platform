import { Router } from "express";
import * as c from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

export const adminRoutes = Router();

/**
 * Admin guard
 * Must be authenticated AND admin role
 */
adminRoutes.use(requireAuth);
adminRoutes.use(requireRole("ADMIN"));

/**
 * Health check (admin only)
 */
adminRoutes.get("/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Admin booking management
 */
adminRoutes.get("/bookings", c.adminListBookings);
adminRoutes.patch("/bookings/:bkgRef", c.adminPatchBooking);
