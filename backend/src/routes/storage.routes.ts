import { Router } from "express";
import * as c from "../controllers/storage.controller";
export const storageRoutes = Router();
storageRoutes.post("/signed-url", c.mintSignedUrl);
