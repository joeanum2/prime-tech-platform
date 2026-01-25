import { Router } from "express";
import * as c from "../controllers/webhooks.controller";
export const webhooksRoutes = Router();
webhooksRoutes.post("/stripe", c.stripeWebhook);
