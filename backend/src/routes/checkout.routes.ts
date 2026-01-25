import { Router } from "express";
import * as c from "../controllers/checkout.controller";
export const checkoutRoutes = Router();
checkoutRoutes.post("/start", c.checkoutStart);
