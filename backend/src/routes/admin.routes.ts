import { Router } from "express";
import * as c from "../controllers/admin.controller";
import { requireRole } from "../middlewares/auth";
export const adminRoutes = Router();
adminRoutes.get("/bookings", requireRole("ADMIN"), c.adminListBookings);
adminRoutes.patch("/bookings/:bkgRef", requireRole("ADMIN"), c.adminPatchBooking);
