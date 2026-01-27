import { Router } from "express";
import { startCheckout } from "../checkout/checkout.controller";

export const checkoutRoutes = Router();
checkoutRoutes.post("/start", startCheckout);
