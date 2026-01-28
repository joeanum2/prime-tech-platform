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
