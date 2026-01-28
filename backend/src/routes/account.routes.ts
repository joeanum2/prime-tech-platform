import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import * as ar from "../controllers/account.read.controller";
import * as c from "../controllers/releases.controller";

export const accountRoutes = Router();

accountRoutes.get("/downloads", requireAuth, c.listDownloads);
accountRoutes.post("/downloads/:releaseId/signed-url", requireAuth, c.mintDownloadUrl);
accountRoutes.get("/orders", requireAuth, ar.listMyOrders);
accountRoutes.get("/entitlements", requireAuth, ar.listMyEntitlements);
