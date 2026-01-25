# CODEX_EXECUTION_PLAN_v1.md
Prime Tech Services – Codex Execution Plan (Frontend + Backend)

STATUS: APPROVED FOR IMPLEMENTATION
VERSION: v1
DATE: 24 January 2026

## 0) Authority and Sources of Truth

Codex MUST treat these as the only authoritative inputs:

1. `_spec/CODEX_HANDOFF_v1` (Backend authoritative specification)
2. `_spec/FRONTEND_HANDOFF_v1.pdf` (Frontend authoritative specification)

Hard rules:

- Do not change API contracts.
- Do not reinterpret requirements.
- Do not invent features, routes, fields, or behaviours.
- If anything is missing/ambiguous, stop and ask for the missing detail before proceeding.
- Preserve uppercase identifiers and patterns (ORD / INV / RCP / LIC / BKG) exactly.

## 1) Repository Layout (Required)

Create or confirm this structure:

- `_spec/`
  - `CODEX_HANDOFF_v1.*` (md/pdf/whatever your source is)
  - `FRONTEND_HANDOFF_v1.pdf`
  - `CODEX_EXECUTION_PLAN_v1.md` (this file)
- `backend/` (or `/apps/backend/`)
- `frontend/` (or `/apps/frontend/`)
- `shared/` (optional, only if required by contracts/types)

Codex must not scatter code outside these roots.

## 2) Execution Order

Codex MUST implement in phases:

- Phase A: Backend (contracts, schema, core flows, infra)
- Phase B: Frontend (shared UI, public routes, account, admin, integration)
- Phase C: Integration + acceptance checks (end-to-end verification)

Each phase must end with:
- a short checklist confirming what is complete,
- what remains,
- and how to run basic verification.

## 3) Phase A – Backend Implementation

### A1) Spec validation (blocking)
Deliverable:
- A short “Spec Completeness Report” (1–2 pages max) stating:
  - Which sections exist in CODEX_HANDOFF_v1
  - Any missing items required to implement
  - A decision-needed list (only if truly missing)

STOP if any required contract detail is missing.

### A2) Backend scaffold
Deliverables:
- Backend folder structure created exactly as required by CODEX_HANDOFF_v1
- `package.json` / tooling
- Environment template:
  - `.env.example` (server-only secrets not populated)
- Baseline server entrypoint and health endpoint (if defined in spec)

Constraints:
- No contract drift.
- No placeholder response shapes.

### A3) Database and Prisma
Deliverables:
- `prisma/schema.prisma` aligned to CODEX_HANDOFF_v1
- Migrations generated and runnable
- Seed (only if required by the spec)

Must include (even if “minimal commerce core”):
- Full user accounts (users, sessions, email verification, password reset)
- Orders + Order Items
- Policy B invoicing (invoice created at checkout initiation)
- Receipts (created on payment confirmation)
- Entitlements
- Licences (LIC-XXXX-XXXX-XXXX, MAX=1 activations)
- Releases + S3 object keys (downloads)
- Invoice/Receipt PDF storage metadata (S3 bucket + objectKey)
- Stripe webhook event idempotency table
- Concurrency-safe counters for:
  - INV-YYYY-NNNNNN
  - RCP-YYYY-NNNNNN
- Identifier formats locked:
  - ORD-YYYYMMDD-XXXX
  - INV-YYYY-NNNNNN
  - RCP-YYYY-NNNNNN
  - LIC-XXXX-XXXX-XXXX

### A4) Core domain modules (in this order)

1) Auth & Session (cookie-based)
2) Orders + Policy B invoicing
3) Payments + Stripe webhooks
4) Licensing + Activation (MAX = 1)
5) Storage (S3) + Signed URLs
6) Booking system
7) Canonical error contract
8) Docker + runtime

Phase A Exit Criteria:
- Prisma migrations succeed on a clean DB
- Core endpoints respond with contract-correct shapes
- Webhook idempotency and receipt creation rules implemented
- Signed URL flow implemented
- Booking flow implemented
- Docker/production run path works

## 4) Phase B – Frontend Implementation (Next.js App Router)

Codex MUST follow `_spec/FRONTEND_HANDOFF_v1.pdf` exactly.

Implementation order:
1) Shared UI components
2) Public routes
3) Account routes
4) Admin routes
5) Signed URL download flow
6) Validation + canonical error UI
7) SEO + accessibility

Phase B Exit Criteria:
- All routes render and function
- Forms validate and show field errors
- Auth gating works correctly
- Admin workflows work end-to-end
- No contract drift in payloads/responses

## 5) Phase C – Integration, QA, Acceptance

Minimum checks:
- Session: login → /auth/me → logout
- Order flow: create invoice at checkout initiation
- Payment webhook: receipt created only on confirmation
- Licence validation: enforce MAX=1 activation
- Download: signed URL minted; expiry handled
- Booking: create → track → admin update status

## 6) Codex Operating Instructions (Must Follow)

Codex must work in this pattern:

1) Read `_spec/` documents
2) Produce a file-by-file implementation plan for the current phase
3) Implement only what is in-scope
4) Provide a verification checklist for that phase
5) Stop and wait for the next phase instruction (or proceed if explicitly instructed)

No guessing. If unclear, ask.
