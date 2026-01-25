import type { RequestHandler } from "express";
import express from "express";

// Use ONLY on Stripe webhook route
export const rawBody: RequestHandler = express.raw({ type: "application/json" });
