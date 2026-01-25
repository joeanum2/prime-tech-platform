import express from "express";
import cookieParser from "cookie-parser";
import { loadEnv } from "./config/env";
import { errorHandler } from "./middlewares/error-handler";

export function buildApp() {
  const env = loadEnv();
  const app = express();

  // NOTE: Tenant resolution middleware will be inserted here in Phase B.2 (after prisma schema is active)
  // NOTE: Stripe webhook uses raw-body; it must be mounted before express.json()

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.SESSION_SECRET));

  // TODO (Phase B.2+): mount routes exactly per API_CONTRACTS_LOCK_v1.md

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use(errorHandler);
  return app;
}
