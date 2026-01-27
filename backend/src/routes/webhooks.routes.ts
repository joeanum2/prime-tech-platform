import { Router } from "express";
import { stripeWebhook } from "../webhooks/stripe.webhook";

export const webhooksRoutes = Router();
webhooksRoutes.post("/stripe", stripeWebhook);
