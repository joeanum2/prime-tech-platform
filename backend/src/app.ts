import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { loadEnv } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";
import { rawBody } from "./middlewares/raw-body";
import { resolveTenant } from "./middlewares/tenant";
import { attachSession } from "./middlewares/auth";

import authRoutes from "./routes/auth.routes";
import { checkoutRoutes } from "./routes/checkout.routes";
import { ordersRoutes } from "./routes/orders.routes";
import { invoicesRoutes } from "./routes/invoices.routes";
import { receiptsRoutes } from "./routes/receipts.routes";
import { licencesRoutes } from "./routes/licences.routes";
import { storageRoutes } from "./routes/storage.routes";
import { releasesRoutes } from "./routes/releases.routes";
import { accountRoutes } from "./routes/account.routes";
import { bookingsRoutes } from "./routes/bookings.routes";
import { servicesRoutes } from "./routes/services.routes";
import { adminRoutes } from "./routes/admin.routes";
import { webhooksRoutes } from "./routes/webhooks.routes";
import { contactRoutes } from "./routes/contact.routes";
import { adminTestEmail } from "./controllers/admin.email.controller";
import { trackBooking } from "./controllers/bookings.controller";

export function buildApp() {
  const env = loadEnv();
  const app = express();
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  );

  // Tenant resolution (must be early)
  app.use("/api", resolveTenant);

  // Stripe webhooks (raw body only)
  app.use("/api/webhooks", rawBody, webhooksRoutes);

  // JSON for everything else
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(attachSession);

  // Routes
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
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
  app.get("/api/track", trackBooking);
  app.use("/api/services", servicesRoutes);
  app.use("/api/contact", contactRoutes);
  app.post("/api/admin/test-email", (req, res, next) => {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) return res.status(500).json({ error: "ADMIN_TOKEN not configured" });

    const auth = req.header("authorization");
    const xAdmin = req.header("x-admin-token");
    const bearerToken = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

    if (xAdmin === adminToken || bearerToken === adminToken) return next();
    return res.status(401).json({ error: "Not authenticated" });
  }, adminTestEmail);
  app.use("/api/admin", adminRoutes);

  // Error handler LAST
  app.use(errorHandler);

  return app;
}

