import { Router } from "express";
import * as c from "../controllers/releases.controller";
export const releasesRoutes = Router();
releasesRoutes.get("/", c.listReleases);
