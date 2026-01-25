import express from "express";
import cookieParser from "cookie-parser";
import { loadEnv } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { tenantStub } from "./middlewares/tenant";
import { authStub } from "./middlewares/auth";
import { rawBody } from "./middlewares/raw-body";

import { authRoutes } from "./routes/auth.routes";
import { checkoutRoutes } from "./routes/checkout.routes";
import { ordersRoutes } from "./routes/orders.routes";
import { invoicesRoutes } from "./routes/invoices.routes";
import { receiptsRoutes } from "./routes/receipts.routes";
import { webhooksRoutes } from "./routes/webhooks.routes";
import { licencesRoutes } from "./routes/licences.routes";
import { storageRoutes } from "./routes/storage.routes";
import { releasesRoutes } from "./routes/releases.routes";
import { accountRoutes } from "./routes/account.routes";
import { bookingsRoutes } from "./routes/bookings.routes";
import { adminRoutes } from "./routes/admin.routes";

export function buildApp() {
  const env = loadEnv();
  const app = express();

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Tenant capture stub
  app.use("/api", tenantStub);

  // Stripe webhook MUST read raw body before JSON parsing
  app.use("/api/webhooks", rawBody, webhooksRoutes);

  // JSON parser for everything else
  app.use(express.json({ limit: "1mb" }));

  app.use(cookieParser(env.SESSION_SECRET));
  app.use("/api", authStub);

  app.use("/api/auth", authRoutes);
  app.use("/api/checkout", checkoutRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/invoices", invoicesRoutes);
  app.use("/api/receipts", receiptsRoutes);
  app.use("/api/licences", licencesRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/releases", releasesRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/bookings", bookingsRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);
  return app;
}
