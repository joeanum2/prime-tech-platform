import { Router } from "express";
import * as c from "../controllers/bookings.controller";
export const bookingsRoutes = Router();
bookingsRoutes.post("/", c.createBooking);
bookingsRoutes.get("/track", c.trackBooking);
