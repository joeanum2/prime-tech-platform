import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/primetech?schema=public"),

  SESSION_SECRET: z.string().min(16).default("dev-session-secret-change-me"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAMESITE: z.enum(["lax","strict","none"]).default("lax"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  SITE_URL: z.string().url().optional(),

  STRIPE_SECRET_KEY: z.string().min(1).default("sk_test_dev_placeholder"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).default("whsec_dev_placeholder"),

  AWS_REGION: z.string().min(1).default("eu-west-2"),
  AWS_ACCESS_KEY_ID: z.string().min(1).default("dev-access-key"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).default("dev-secret-key"),
  S3_BUCKET_PRIVATE: z.string().min(1).default("primetech-private-dev")
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`ENV_INVALID: ${issues}`);
  }
  return parsed.data;
}
