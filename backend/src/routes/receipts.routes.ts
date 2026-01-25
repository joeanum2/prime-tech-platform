import { Router } from "express";
import * as c from "../controllers/receipts.controller";
export const receiptsRoutes = Router();
receiptsRoutes.get("/:rcpNumber", c.getReceipt);
receiptsRoutes.post("/:rcpNumber/pdf", c.mintReceiptPdfUrl);
