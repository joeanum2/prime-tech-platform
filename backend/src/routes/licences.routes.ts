import { Router } from "express";
import * as c from "../controllers/licences.controller";
export const licencesRoutes = Router();
licencesRoutes.get("/", c.listLicences);
licencesRoutes.get("/:licKey", c.getLicence);
licencesRoutes.post("/validate", c.validateLicence);
licencesRoutes.post("/activate", c.activateLicence);
