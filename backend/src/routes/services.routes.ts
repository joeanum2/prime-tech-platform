import { Router } from "express";
import { listServices } from "../controllers/services.controller";

export const servicesRoutes = Router();

servicesRoutes.get("/", listServices);
