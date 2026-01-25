import { Router } from "express";
import * as c from "../controllers/invoices.controller";
export const invoicesRoutes = Router();
invoicesRoutes.get("/:invNumber", c.getInvoice);
invoicesRoutes.post("/:invNumber/pdf", c.mintInvoicePdfUrl);
