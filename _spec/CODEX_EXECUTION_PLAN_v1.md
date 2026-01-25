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
- Login/logout/session endpoints per contract
- Email verification + password reset per contract
- No tokens in localStorage (frontend rule, but backend must support cookie sessions)

2) Orders + Policy B invoicing
- Invoice is created at checkout initiation (Policy B)
- Order identifiers are generated correctly
- Invoice numbering is concurrency-safe

3) Payments + Stripe webhooks
- Webhook ingestion with idempotency enforced
- Receipt created only after payment confirmation
- Receipt numbering is concurrency-safe
- Store provider IDs as fields, not as PKs

4) Licensing + Activation (MAX = 1)
- Licence lifecycle rules enforced
- Activation rules enforced
- Offline grace rules as per authority spec (if included in CODEX_HANDOFF_v1)
- Licence validation endpoint per contract

5) Storage (S3) + Signed URLs
- Signed URL minting endpoints per contract
- No public bucket access
- Support for:
  - Release downloads
  - Invoice PDFs
  - Receipt PDFs

6) Booking system
- Booking create/track/update flows per contract
- Status transitions enforced server-side
- Admin actions gated by role/auth rules

### A5) Canonical error contract
Deliverables:
- Central error formatter producing the canonical error shape
- Validation errors mapped consistently across endpoints
- No ad-hoc error shapes

### A6) Security hardening (backend-side)
Deliverables (as per spec):
- Cookie flags: HttpOnly/Secure/SameSite (as required)
- Rate limits if specified
- Basic request validation everywhere
- Audit log if specified

### A7) Docker + runtime
Deliverables:
- Dockerfile(s) and docker-compose (as per spec)
- Production run method documented (PM2/Node/Docker per spec)
- A minimal smoke test script or commands list:
  - migrate
  - start
  - verify core endpoints

Phase A Exit Criteria:
- Prisma migrations succeed on a clean DB
- Core endpoints respond with contract-correct shapes
- Webhook idempotency and receipt creation rules implemented
- Signed URL flow implemented
- Booking flow implemented
- Docker/production run path works

## 4) Phase B – Frontend Implementation (Next.js App Router)

Codex MUST follow `_spec/FRONTEND_HANDOFF_v1.pdf` exactly.

### B1) Frontend scaffold
Deliverables:
- Next.js App Router project
- Tailwind configured
- `.env.example` with:
  - NEXT_PUBLIC_SITE_URL
  - NEXT_PUBLIC_API_BASE

Constraints:
- No hard-coded localhost in production paths.
- No client storage of auth tokens.

### B2) Shared UI components first (required)
Deliverables:
- LayoutShell
- SiteHeader
- SiteFooter
- Card
- Button variants
- Inputs (Input/Select/Textarea)
- Alert
- Badge
- Table
- Modal/Drawer
- Loading skeletons

### B3) Public routes
Implement (minimum):
- `/`
- `/services`
- `/services/[slug]`
- `/book`
- `/track`
- `/articles`
- `/articles/[slug]`
- `/contact`
- `/legal/privacy`
- `/legal/terms`

### B4) Authenticated account routes
Implement:
- `/account`
- `/account/orders`
- `/account/orders/[ordId]`
- `/account/licences`
- `/account/downloads`
- `/account/settings`

Notes:
- All requests must send credentials (cookies).
- Errors must map to canonical error contract UI.

### B5) Admin routes
Implement:
- `/admin`
- `/admin/bookings`
- `/admin/orders`
- `/admin/releases`
- `/admin/users`

Constraints:
- Role-gated server-side (no purely client gating).
- Admin secrets must never be exposed to the browser.

### B6) Downloads + signed URL UX
Deliverables:
- Entitled releases list view
- “Download” triggers mint signed URL and opens immediately
- Handles expiry by re-requesting signed URL
- Shows licence validation failures cleanly

### B7) Frontend validation + identifier patterns
Deliverables:
- Zod validation mirroring API contracts
- Pattern validation for identifiers:
  - ORD / INV / RCP / LIC / BKG
- Single error presenter component

### B8) SEO + accessibility
Deliverables:
- Metadata per page
- Canonical URLs for articles
- Accessible labels/focus states
- alt text rules applied

Phase B Exit Criteria:
- All routes render and function
- Forms validate and show field errors
- Auth gating works correctly
- Admin workflows work end-to-end
- No contract drift in payloads/responses

## 5) Phase C – Integration, QA, Acceptance

### C1) Contract verification
Deliverable:
- A short list of tested endpoints and screenshots/logs of success (or equivalent evidence)

Minimum checks:
- Session: login → /auth/me → logout
- Order flow: create invoice at checkout initiation
- Payment webhook: receipt created only on confirmation
- Licence validation: enforce MAX=1 activation
- Download: signed URL minted; expiry handled
- Booking: create → track → admin update status

### C2) Non-functional checks
- No hard-coded localhost in production builds
- No tokens in localStorage
- Canonical error contract used everywhere
- Basic accessibility checks (labels, focus)
- Basic performance sanity (no massive layout shifts)

### C3) Release readiness
Deliverables:
- “Runbook” (short) for:
  - env setup
  - migrations
  - start backend
  - start frontend
  - deploy steps (as per your environment)

Final Exit Criteria:
- All acceptance criteria in FRONTEND_HANDOFF_v1 are met
- Backend meets CODEX_HANDOFF_v1 rules with no contract deviations
- End-to-end flow works for booking + commerce + downloads

## 6) Codex Operating Instructions (Must Follow)

Codex must work in this pattern:

1) Read `_spec/` documents
2) Produce a file-by-file implementation plan for the current phase
3) Implement only what is in-scope
4) Provide a verification checklist for that phase
5) Stop and wait for the next phase instruction (or proceed if explicitly instructed)

No guessing. If unclear, ask.
