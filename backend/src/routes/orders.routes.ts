import { Router } from "express";
import * as c from "../controllers/orders.controller";
export const ordersRoutes = Router();
ordersRoutes.get("/", c.listOrders);
ordersRoutes.get("/:ordId", c.getOrder);
