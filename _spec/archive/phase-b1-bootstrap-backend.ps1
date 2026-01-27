$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$Backend = Join-Path $Root "backend"

Write-Host "== Prime Tech Platform :: Phase B.1 Backend Bootstrap ==" -ForegroundColor Cyan
Write-Host "Root:    $Root"
Write-Host "Backend: $Backend"

# 0) Create folders
$dirs = @(
  "backend",
  "backend/src",
  "backend/src/config",
  "backend/src/middlewares",
  "backend/src/routes",
  "backend/src/controllers",
  "backend/src/services",
  "backend/src/integrations/stripe",
  "backend/src/integrations/aws",
  "backend/src/domain",
  "backend/src/db",
  "backend/src/validation",
  "backend/prisma"
)
foreach ($d in $dirs) {
  $p = Join-Path $Root $d
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

# 1) package.json + deps
Push-Location $Backend

if (-not (Test-Path (Join-Path $Backend "package.json"))) {
  npm init -y | Out-Null
}

# Runtime deps (minimal, aligned to spec)
npm i express cookie-parser zod dotenv stripe @prisma/client @aws-sdk/client-s3 @aws-sdk/s3-request-presigner | Out-Null

# Dev deps
npm i -D typescript ts-node-dev prisma @types/node @types/express @types/cookie-parser | Out-Null

# 2) tsconfig.json
@'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "Node",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "tsconfig.json")

# 3) Update package.json scripts
$pkgPath = Join-Path $Backend "package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg | Add-Member -MemberType NoteProperty -Name scripts -Value @{} }
$pkg.scripts | Add-Member -MemberType NoteProperty -Name dev -Value "ts-node-dev --respawn --transpile-only src/index.ts" -Force
$pkg.scripts | Add-Member -MemberType NoteProperty -Name build -Value "tsc" -Force
$pkg.scripts | Add-Member -MemberType NoteProperty -Name start -Value "node dist/index.js" -Force
$pkg.scripts | Add-Member -MemberType NoteProperty -Name "prisma:generate" -Value "prisma generate" -Force
$pkg.scripts | Add-Member -MemberType NoteProperty -Name "prisma:migrate" -Value "prisma migrate dev" -Force
$pkg.scripts | Add-Member -MemberType NoteProperty -Name "prisma:studio" -Value "prisma studio" -Force
$pkg | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $pkgPath

# 4) src/config/constants.ts (LOCKED)
@'
export const IDENTIFIERS = {
  ORD: {
    prefix: "ORD",
    regex: /^ORD-[0-9]{8}-[A-Z0-9]{4}$/
  },
  INV: {
    prefix: "INV",
    regex: /^INV-[0-9]{4}-[0-9]{6}$/
  },
  RCP: {
    prefix: "RCP",
    regex: /^RCP-[0-9]{4}-[0-9]{6}$/
  },
  LIC: {
    prefix: "LIC",
    regex: /^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  },
  BKG: {
    prefix: "BKG",
    regex: /^BKG-[A-Z0-9]{8}$/
  }
} as const;

export const DEFAULTS = {
  SIGNED_URL_TTL_SECONDS: 600,
  CURRENCY: "GBP"
} as const;

export const BOOKING_STATUS = ["NEW","CONFIRMED","IN_PROGRESS","COMPLETED","CANCELLED"] as const;
export const ORDER_STATUS = ["PENDING_PAYMENT","PAID","FAILED","CANCELLED"] as const;
export const LICENCE_STATUS = ["ACTIVE","REVOKED"] as const;
export const USER_ROLES = ["USER","STAFF","ADMIN"] as const;
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/config/constants.ts")

# 5) src/config/env.ts (single source of truth; LOCKED vars)
@'
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(16),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAMESITE: z.enum(["lax","strict","none"]).default("lax"),
  APP_BASE_URL: z.string().url(),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),

  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_PRIVATE: z.string().min(1)
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
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/config/env.ts")

# 6) domain/errors.ts (canonical error codes; minimal set to start; extend as needed)
@'
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_IN_USE"
  | "TOKEN_INVALID_OR_EXPIRED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "ORDER_NOT_FOUND"
  | "LICENCE_NOT_FOUND"
  | "LICENCE_MAX_ACTIVATIONS"
  | "BOOKING_NOT_FOUND"
  | "SERVICE_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "RELEASE_NOT_FOUND"
  | "ENTITLEMENT_REQUIRED"
  | "LICENCE_REQUIRED"
  | "LICENCE_INVALID"
  | "FORBIDDEN_OBJECT_KEY"
  | "NOT_IMPLEMENTED";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: { fieldErrors?: Record<string, string[]>; meta?: Record<string, unknown> };

  constructor(code: ErrorCode, message: string, status: number, details?: AppError["details"]) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/domain/errors.ts")

# 7) middlewares/error-handler.ts (canonical error contract)
@'
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../domain/errors";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: {
          fieldErrors: err.details?.fieldErrors ?? {},
          meta: { ...(err.details?.meta ?? {}), requestId }
        }
      }
    });
  }

  // Fallback
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      details: { fieldErrors: {}, meta: { requestId } }
    }
  });
}
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/middlewares/error-handler.ts")

# 8) middlewares/raw-body.ts (Stripe needs raw body)
@'
import type { RequestHandler } from "express";
import express from "express";

// Use ONLY on Stripe webhook route
export const rawBody: RequestHandler = express.raw({ type: "application/json" });
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/middlewares/raw-body.ts")

# 9) db/prisma.ts
@'
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/db/prisma.ts")

# 10) app.ts + index.ts (boot chain; route mounting placeholders)
@'
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
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/app.ts")

@'
import { buildApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();
const app = buildApp();

app.listen(env.PORT, () => {
  console.log(`backend listening on :${env.PORT}`);
});
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "src/index.ts")

# 11) Prisma schema (baseline per Architecture Lock)
@'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  STAFF
  ADMIN
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  FAILED
  CANCELLED
}

enum BookingStatus {
  NEW
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum LicenceStatus {
  ACTIVE
  REVOKED
}

enum CounterType {
  INV
  RCP
}

model Tenant {
  id        String        @id @default(uuid()) @db.Uuid
  key       String        @unique
  name      String
  status    String        @default("ACTIVE")
  createdAt DateTime      @default(now())

  domains   TenantDomain[]
  users     User[]
  sessions  Session[]
}

model TenantDomain {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  domain    String   @unique
  isPrimary Boolean  @default(false)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model User {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @db.Uuid
  email         String
  fullName      String
  passwordHash  String
  role          UserRole  @default(USER)
  verifiedAt    DateTime?
  createdAt     DateTime  @default(now())

  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sessions Session[]

  @@unique([tenantId, email])
  @@index([tenantId])
}

model Session {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId         String  @db.Uuid
  userId           String  @db.Uuid
  sessionTokenHash String  @unique
  expiresAt DateTime
  createdAt        DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
}

model EmailVerificationToken {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  userId    String   @db.Uuid
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
}

model PasswordResetToken {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  userId    String   @db.Uuid
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
}

model Order {
  id        String      @id @default(uuid()) @db.Uuid
  tenantId  String      @db.Uuid
  ordId     String
  userId    String?     @db.Uuid
  status    OrderStatus @default(PENDING_PAYMENT)
  currency  String      @default("GBP")
  subtotal  Int         @default(0)
  tax       Int         @default(0)
  total     Int         @default(0)
  createdAt DateTime    @default(now())

  items    OrderItem[]
  invoice  Invoice?
  payment  Payment?
  receipt  Receipt?

  @@unique([tenantId, ordId])
  @@index([tenantId])
}

model OrderItem {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  orderId   String   @db.Uuid
  releaseId String   @db.Uuid
  quantity  Int
  unitPrice Int
  currency  String   @default("GBP")

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([orderId])
}

model Invoice {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @db.Uuid
  invNumber   String
  orderId     String   @unique @db.Uuid
  status      String   @default("ISSUED")
  pdfBucket   String?
  pdfObjectKey String?
  createdAt   DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([tenantId, invNumber])
  @@index([tenantId])
}

model Payment {
  id                String   @id @default(uuid()) @db.Uuid
  tenantId           String  @db.Uuid
  orderId            String  @unique @db.Uuid
  provider           String  @default("stripe")
  checkoutSessionId  String  @unique
  paymentIntentId    String?
  status             String  @default("PENDING")
  createdAt          DateTime @default(now())

  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model Receipt {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  rcpNumber    String
  orderId      String   @unique @db.Uuid
  paymentId    String?  @db.Uuid
  pdfBucket    String?
  pdfObjectKey String?
  createdAt    DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([tenantId, rcpNumber])
  @@index([tenantId])
}

model WebhookEvent {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId         String  @db.Uuid
  provider         String  @default("stripe")
  providerEventId  String  @unique
  processedAt      DateTime?
  createdAt        DateTime @default(now())

  @@index([tenantId])
}

model Counter {
  id       String      @id @default(uuid()) @db.Uuid
  tenantId  String     @db.Uuid
  year     Int
  type     CounterType
  value    Int         @default(0)

  @@unique([tenantId, year, type])
  @@index([tenantId])
}

model Release {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId    String  @db.Uuid
  slug       String
  title      String
  version    String
  filename   String
  s3Bucket   String
  s3ObjectKey String
  createdAt  DateTime @default(now())

  @@unique([tenantId, slug])
  @@index([tenantId])
}

model Entitlement {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @db.Uuid
  userId    String   @db.Uuid
  releaseId String   @db.Uuid
  grantedAt DateTime @default(now())

  @@unique([tenantId, userId, releaseId])
  @@index([tenantId])
  @@index([userId])
}

model Licence {
  id        String       @id @default(uuid()) @db.Uuid
  tenantId  String       @db.Uuid
  userId    String?      @db.Uuid
  licKey    String
  status    LicenceStatus @default(ACTIVE)
  createdAt DateTime     @default(now())

  activation Activation?

  @@unique([tenantId, licKey])
  @@index([tenantId])
}

model Activation {
  id                 String   @id @default(uuid()) @db.Uuid
  tenantId            String  @db.Uuid
  licenceId          String   @unique @db.Uuid
  deviceFingerprintHash String
  activatedAt         DateTime @default(now())

  licence Licence @relation(fields: [licenceId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}

model Service {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId     String  @db.Uuid
  slug        String
  name        String
  description String
  price       Int
  currency    String   @default("GBP")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@unique([tenantId, slug])
  @@index([tenantId])
}

model Booking {
  id                 String        @id @default(uuid()) @db.Uuid
  tenantId            String       @db.Uuid
  bkgRef             String
  status             BookingStatus @default(NEW)
  fullName           String
  email              String
  serviceSlug        String
  serviceNameSnapshot String
  priceSnapshot      Int
  currency           String        @default("GBP")
  preferredAt        DateTime
  notes              String?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@unique([tenantId, bkgRef])
  @@index([tenantId])
}
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "prisma/schema.prisma")

# 12) .env.example
@'
# Server
NODE_ENV=development
PORT=4000
APP_BASE_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/primetech?schema=public

# Sessions
SESSION_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS / S3
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
S3_BUCKET_PRIVATE=primetech-private
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend ".env.example")

# 13) Docker artifacts (simple dev compose)
@'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm","run","start"]
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "Dockerfile")

@'
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_USER: postgres
      POSTGRES_DB: primetech
    ports:
      - "5432:5432"
    volumes:
      - primetech_db:/var/lib/postgresql/data

  backend:
    build: .
    env_file:
      - .env
    ports:
      - "4000:4000"
    depends_on:
      - db

volumes:
  primetech_db:
'@ | Set-Content -Encoding UTF8 (Join-Path $Backend "docker-compose.yml")

# 14) Prisma generate
npx prisma generate | Out-Null

Pop-Location

Write-Host "`nDONE: backend scaffold + env + prisma schema + docker artifacts created." -ForegroundColor Green
Write-Host "Next: create backend/.env, run migrations, then mount routes (Phase B.2)." -ForegroundColor Yellow
