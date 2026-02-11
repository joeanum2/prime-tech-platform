import Stripe from "stripe";
import { loadEnv } from "../../config/env";

const env = loadEnv();

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
});
