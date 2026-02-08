import { Router } from "express";
import { submitContact } from "../controllers/contact.controller";

export const contactRoutes = Router();

contactRoutes.post("/", submitContact);
