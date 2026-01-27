# Prime Tech Platform — ARCHITECTURE_LOCK_v1
STATUS: LOCKED (Authoritative)
DEPLOY TARGET: Existing Prime Tech Services VPS (Ubuntu 24.04), Nginx + PM2 + Postgres

## 1. Goals
- Provide a production-grade backend for multi-tenant SaaS operations:
  - Accounts (sessions, auth)
  - Commerce (orders, invoices, receipts, entitlements)
  - Licensing (MAX=1 activation)
  - Storage (S3 private + signed URLs)
  - Bookings (service bookings)
  - Payments (Stripe Checkout + webhooks)
- Support local dev on Windows and deploy to the existing VPS reliably with repeatable scripts.
- Avoid piecemeal “patch scripts”; prefer deterministic, idempotent scripts.

## 2. System Topology
- One monorepo: prime-tech-platform
- Backend service (Node.js/TypeScript/Express) deployed on VPS via PM2 behind Nginx.
- Postgres database on VPS (existing or dedicated instance on same server).
- S3 private bucket for:
  - release binaries
  - invoice PDFs metadata
  - receipt PDFs metadata
  - signed URL delivery only
- Stripe for payments:
  - Checkout Session creation
  - Webhook verification (raw body)
  - Idempotent processing

## 3. Repository Structure
Repo root:
- _spec/ (locked docs)
- backend/ (single backend service)
- infra/ (VPS deploy configs: Nginx, PM2 ecosystem, system notes)
- scripts/ (idempotent dev+deploy scripts)

Backend:
- backend/src/index.ts (server start)
- backend/src/app.ts (express app wiring)
- backend/src/config/* (env parsing/validation)
- backend/src/middlewares/* (tenant/auth/error/raw-body)
- backend/src/routes/* (routing only)
- backend/src/controllers/* (HTTP handlers only)
- backend/src/services/* (business rules)
- backend/src/integrations/* (stripe, aws)
- backend/src/db/prisma.ts (Prisma client)
- backend/prisma/schema.prisma
- backend/prisma/seed.ts
- backend/docker-compose.yml (local only; VPS uses system Postgres)
- backend/.env.example (never commit backend/.env)

## 4. Runtime & Networking
Local:
- backend runs on 127.0.0.1:4000
- frontend (later) runs on localhost:3000
- curl should use 127.0.0.1 to avoid localhost resolution issues.

VPS:
- Nginx terminates TLS and reverse-proxies to PM2 process on 127.0.0.1:4000
- API served at: https://<api-domain>/ (e.g., api.<domain>)
- Host header forwarded (for tenant resolution)

## 5. Tenancy
- Tenant resolved from hostname:
  - Prefer x-forwarded-host, else host
  - Lookup in tenant_domains table
  - Attach tenant context to request
- All data access must be scoped to tenantId.

## 6. Authentication
- Cookie-based sessions
- No tokens in localStorage
- Session cookie name: session
- requireAuth middleware loads session + user and attaches req.user
- requireRole("ADMIN") gates admin endpoints

## 7. Payments (Stripe)
- Checkout Session creation endpoint:
  - Creates Order + Invoice (Policy B) at checkout initiation
  - Stores Checkout Session ID on Payment record
- Webhooks:
  - Stripe webhook endpoint must use raw body middleware
  - Verify signature using STRIPE_WEBHOOK_SECRET
  - Idempotency via webhook_events table using providerEventId unique
  - On payment success:
    - Mark Order PAID
    - Create Receipt
    - Create Entitlement(s)
- No business logic in routes; controllers call services.

## 8. Storage
- S3 private bucket only
- Signed URL endpoints:
  - For releases and PDF downloads
- Never expose public S3 objects.

## 9. Database
- Prisma + Postgres
- All primary keys are UUID (String @db.Uuid)
- Strict tenant scoping in tables (tenantId everywhere)

## 10. Production Deployment Rules
- backend/.env is environment-specific and NOT committed
- Nginx + PM2:
  - PM2 process: primetech-platform-backend (or similar)
  - PM2 ecosystem file stored in infra/
- No “manual editing on server”; deploy via scripts/GitHub Actions or SSH scripts.

## 11. Quality Gates
- Single consistent export style for routes:
  - Named export for routes (e.g., export const adminRoutes = Router())
  - app.ts imports must match exports (no default/named mismatch)
- app.ts must mount middlewares in strict order:
  1) tenant resolution
  2) webhook raw-body + webhook route
  3) json parser
  4) cookie parser
  5) auth (session)
  6) route mounts
  7) error handler
