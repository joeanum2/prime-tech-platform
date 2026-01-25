# CODEX_HANDOFF_v1
Prime Tech Services – Backend Implementation Specification

STATUS: APPROVED FOR IMPLEMENTATION  
VERSION: v1  
DATE: 24 January 2026

This document is the authoritative backend specification for Prime Tech Services.
It defines system architecture, API contracts, database model summary, payments, licensing,
storage, booking logic, security rules, and execution rules for Codex.

**Hard rules (mandatory):**
- Do not change contracts defined in this document.
- Do not reinterpret requirements.
- Do not invent features or endpoints not defined here.
- All identifiers remain uppercase and pattern-validated: **ORD / INV / RCP / LIC / BKG**.
- Authentication is **cookie-based sessions**; **no tokens in localStorage**.
- Storage uses **AWS S3** with **signed URLs only**; no public bucket access.
- Payments follow **Policy B** (invoice at checkout initiation; receipt after payment confirmation).
- Licensing is enforced for all software; **MAX = 1 activation** per licence.
- Canonical error contract required across all endpoints.

---

## 1. System Architecture

### 1.1 Runtime and stack
- Backend: Node.js + TypeScript
- Web framework: Express (or equivalent minimal HTTP server)
- DB: PostgreSQL
- ORM: Prisma
- Deployment: Docker compatible; PM2 optional for VPS runtime

### 1.2 Tenancy (schema-only multi-tenant)
- **Every domain table includes `tenantId`** (UUID).
- All queries MUST be scoped by `tenantId`.
- Tenant isolation is mandatory at query level and via composite unique indexes where relevant.

### 1.3 Identifier formats (locked)
- **ORD**: `ORD-YYYYMMDD-XXXX` where `XXXX` is uppercase alphanumeric.
- **INV**: `INV-YYYY-NNNNNN` year-scoped numeric counter, zero-padded to 6.
- **RCP**: `RCP-YYYY-NNNNNN` year-scoped numeric counter, zero-padded to 6.
- **LIC**: `LIC-XXXX-XXXX-XXXX` where each block is uppercase alphanumeric length 4.
- **BKG**: `BKG-XXXXXXXX` uppercase alphanumeric length 8.

### 1.4 Data integrity
- Use UUID primary keys for all tables.
- Provider IDs (Stripe IDs) are stored as fields and indexed/unique where required.
- Use transaction boundaries for:
  - checkout initiation (order + invoice creation)
  - webhook handling (idempotent event + state transitions + receipt)
  - activation creation (enforce MAX=1)

---

## 2. API Contracts

### 2.1 Global conventions
- Base path: `/api`
- JSON only.
- All authenticated requests rely on session cookies (`credentials: include`).
- Canonical error contract for non-2xx.

### 2.2 Canonical error contract
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": {
      "fieldErrors": {
        "fieldName": ["message1", "message2"]
      },
      "meta": {}
    }
  }
}
```

### 2.3 Auth endpoints (cookie sessions)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `POST /api/auth/verify-email`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

Rules:
- Sessions are server-side (DB-backed) and issued via HttpOnly cookies.
- Email verification and password reset use one-time tokens stored hashed in DB.

### 2.4 Orders, invoices, receipts
- `POST /api/checkout/start`
  - Creates **Order** + **Invoice (Policy B)** at initiation.
  - Returns `ordId`, `invNumber`, and Stripe checkout/session info (provider refs only).
- `GET /api/orders`
- `GET /api/orders/{ordId}`
- `GET /api/invoices/{invNumber}` (metadata)
- `POST /api/invoices/{invNumber}/pdf` (mint signed URL for invoice PDF)
- `GET /api/receipts/{rcpNumber}` (metadata)
- `POST /api/receipts/{rcpNumber}/pdf` (mint signed URL for receipt PDF)

Rule:
- Receipt is created ONLY when payment is confirmed (webhook).

### 2.5 Payments (Stripe)
- `POST /api/webhooks/stripe`
  - Must verify signature.
  - Must be idempotent via `WebhookEvent` table.

Rules:
- Payment confirmation triggers:
  - order status update
  - receipt creation
  - entitlement creation

### 2.6 Licensing
- `GET  /api/licences`
- `GET  /api/licences/{licKey}`
- `POST /api/licences/validate`
- `POST /api/licences/activate` (creates activation; enforces MAX=1)

Rules:
- Licence required for all software downloads.
- Activation MAX=1: reject second activation with canonical error.

### 2.7 Storage (S3 signed URLs only)
- `POST /api/storage/signed-url`

Input (JSON):
- bucket (string)
- objectKey (string)
- ttlSeconds (int)
- contentType (string, optional)
- contentDisposition (string, optional)

Output (JSON):
- bucket (string)
- objectKey (string)
- ttlSeconds (int)
- expiresAt (ISO string)
- url (URL string)

### 2.8 Releases / downloads
- `GET /api/releases`
- `GET /api/account/downloads` (entitled releases only)
- `POST /api/account/downloads/{releaseId}/signed-url`

Rules:
- Downloads require entitlement + valid licence.

### 2.9 Booking
- `POST /api/bookings`
- `GET  /api/bookings/track` (requires `bkgRef` + `email`)
- `GET  /api/admin/bookings`
- `PATCH /api/admin/bookings/{bkgRef}` (status updates)

Booking status flow:
- `NEW` → `CONFIRMED` → `IN_PROGRESS` → `COMPLETED`
- Optional: `CANCELLED` (from `NEW` or `CONFIRMED` only)

Admin rules:
- Admin endpoints require role-gated session.

---

## 3. Database & Prisma Model Summary (Multi-tenant)

### 3.1 Core models (required)
- Tenant
- User
- Session
- EmailVerificationToken
- PasswordResetToken
- Order
- OrderItem
- Invoice
- Receipt
- Payment
- WebhookEvent (Stripe idempotency)
- Release
- Entitlement
- Licence
- Activation
- Counter (tenant+year scoped)
- Booking

### 3.2 Counter rules (concurrency-safe)
- Counters are scoped by **tenantId + year + type**.
- Types: `INV`, `RCP`
- Format:
  - `INV-YYYY-NNNNNN` (NNNNNN is 6-digit zero-padded)
  - `RCP-YYYY-NNNNNN` (NNNNNN is 6-digit zero-padded)
- Atomic increment using transaction + row-level lock.

---

## 4. Payments & Stripe (Policy B)

### 4.1 Policy B definition (mandatory)
- **Invoice is created at checkout initiation** (before payment confirmation).
- **Receipt is created only after payment is confirmed**.

### 4.2 Webhook idempotency
- Store Stripe event ID uniquely in `WebhookEvent`.
- If already processed, return 200 without side effects.

---

## 5. Licensing & Activation Rules

### 5.1 Licence key format
- `LIC-XXXX-XXXX-XXXX` uppercase alphanumeric.

### 5.2 Activation rule (MAX=1)
- Each licence may have **at most one active activation**.
- Reject additional activations with canonical error `LICENCE_MAX_ACTIVATIONS`.

---

## 6. Booking System
- Create booking returns `BKG-XXXXXXXX`.
- Track requires `bkgRef` + `email`.
- Admin updates enforce permitted transitions.

---

## 7. Storage & Signed URLs
- Store bucket + objectKey metadata for releases and PDFs.
- TTL default: 5–15 minutes.
- Signed URLs are server-generated only.

---

## 8. Environment Variables

Backend required:
- DATABASE_URL
- NODE_ENV
- PORT
- SESSION_SECRET
- COOKIE_SECURE
- COOKIE_SAMESITE
- APP_BASE_URL

Stripe:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

S3:
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- S3_BUCKET_PRIVATE

Frontend required:
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_API_BASE

---

## 9. Security & Safety Rules
- Validate all inputs server-side (Zod or equivalent).
- Enforce tenancy scoping on all reads/writes.
- Session cookies must be HttpOnly and secure as appropriate.
- Role-gate admin endpoints.
- Rate limit auth and webhook endpoints (recommended).

---

## 10. Execution Rules for Codex
Codex must implement in this order:
1. Auth/session
2. Checkout start (Order + Invoice)
3. Stripe webhook (idempotent) + Receipt + Entitlements
4. Licensing + Activation MAX=1
5. S3 signed URLs
6. Booking
7. Canonical error contract
8. Docker runtime + smoke tests

Codex must NOT:
- change contracts
- add endpoints not listed
- make S3 public
- assume token-based auth

---

## 11. Approved for Implementation
This specification is approved and must be treated as the sole source of truth for backend implementation.
Any change requires a versioned update and explicit re-approval.
