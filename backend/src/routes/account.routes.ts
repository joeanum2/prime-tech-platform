import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import * as c from "../controllers/releases.controller";
export const accountRoutes = Router();
accountRoutes.get("/downloads", c.listDownloads);
accountRoutes.post("/downloads/:releaseId/signed-url", c.mintDownloadUrl);

