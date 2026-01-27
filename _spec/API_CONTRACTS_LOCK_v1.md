API_CONTRACTS_LOCK_v1.md

Prime Tech Platform — API Contracts Lock
Status: APPROVED
Version: v1
Date: 2026-01-25

This document locks the exact API request/response contracts for the backend.
It is authoritative and must be implemented exactly. No inference is permitted.

Global Rules (mandatory):

Base path: /api

JSON only

Auth uses cookie-based sessions (HttpOnly cookies). Client must use credentials: include.

Tenancy is hostname-resolved server-side (no tenantId passed by client).

All identifiers are uppercase and pattern-validated: ORD / INV / RCP / LIC / BKG

Canonical error contract is used for all non-2xx responses.

0. Canonical Error Contract (ALL non-2xx)

Response (JSON):

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


Field conventions:

code is UPPER_SNAKE_CASE

fieldErrors keys match request field names

meta may include diagnostic IDs (requestId, ordId, invNumber), but never secrets

1. Auth & Session
1.1 POST /api/auth/register

Create an account and start a session.

Request (JSON):

{
  "email": "user@example.com",
  "password": "string (min 8)",
  "fullName": "string"
}


Response 201 (JSON):

{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "string",
    "role": "USER",
    "emailVerified": false,
    "createdAt": "ISO_DATETIME"
  }
}


Errors:

EMAIL_ALREADY_IN_USE

VALIDATION_ERROR

1.2 POST /api/auth/login

Request (JSON):

{
  "email": "user@example.com",
  "password": "string"
}


Response 200 (JSON):

{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "string",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "ISO_DATETIME"
  }
}


Errors:

INVALID_CREDENTIALS

VALIDATION_ERROR

1.3 POST /api/auth/logout

Clears session cookie.

Request: none
Response 204: no body

1.4 GET /api/auth/me

Response 200 (JSON):

{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "string",
    "role": "USER",
    "emailVerified": true,
    "createdAt": "ISO_DATETIME"
  }
}


Response 200 if not logged in (JSON):

{
  "user": null
}

1.5 POST /api/auth/verify-email

Request (JSON):

{
  "token": "string"
}


Response 200 (JSON):

{
  "verified": true
}


Errors:

TOKEN_INVALID_OR_EXPIRED

VALIDATION_ERROR

1.6 POST /api/auth/request-password-reset

Request (JSON):

{
  "email": "user@example.com"
}


Response 200 (JSON):

{
  "requested": true
}


Notes:

Always return requested: true even if email is not found (privacy).

1.7 POST /api/auth/reset-password

Request (JSON):

{
  "token": "string",
  "newPassword": "string (min 8)"
}


Response 200 (JSON):

{
  "reset": true
}


Errors:

TOKEN_INVALID_OR_EXPIRED

VALIDATION_ERROR

2. Checkout, Orders, Invoices, Receipts (Policy B)
2.1 POST /api/checkout/start

Creates Order + Invoice (Policy B) and returns Stripe Checkout URL.

Request (JSON):

{
  "items": [
    {
      "releaseId": "uuid",
      "quantity": 1
    }
  ],
  "customer": {
    "email": "user@example.com",
    "fullName": "string"
  },
  "successUrl": "https://your-site/success?ordId={ORD_ID}",
  "cancelUrl": "https://your-site/cancel?ordId={ORD_ID}"
}


Response 201 (JSON):

{
  "ordId": "ORD-20260125-AB12",
  "invNumber": "INV-2026-000001",
  "checkout": {
    "provider": "stripe",
    "checkoutSessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}


Errors:

AUTH_REQUIRED (if guest checkout is not enabled; default is auth required)

RELEASE_NOT_FOUND

VALIDATION_ERROR

2.2 GET /api/orders

Returns current user orders.

Response 200 (JSON):

{
  "orders": [
    {
      "ordId": "ORD-20260125-AB12",
      "status": "PENDING_PAYMENT",
      "createdAt": "ISO_DATETIME",
      "totals": {
        "currency": "GBP",
        "subtotal": 1000,
        "tax": 0,
        "total": 1000
      },
      "invNumber": "INV-2026-000001"
    }
  ]
}

2.3 GET /api/orders/{ordId}

Response 200 (JSON):

{
  "order": {
    "ordId": "ORD-20260125-AB12",
    "status": "PAID",
    "createdAt": "ISO_DATETIME",
    "items": [
      {
        "releaseId": "uuid",
        "quantity": 1,
        "unitPrice": 1000,
        "currency": "GBP"
      }
    ],
    "totals": {
      "currency": "GBP",
      "subtotal": 1000,
      "tax": 0,
      "total": 1000
    },
    "invNumber": "INV-2026-000001",
    "rcpNumber": "RCP-2026-000001"
  }
}


Errors:

ORDER_NOT_FOUND

2.4 GET /api/invoices/{invNumber}

Metadata only.

Response 200 (JSON):

{
  "invoice": {
    "invNumber": "INV-2026-000001",
    "ordId": "ORD-20260125-AB12",
    "status": "ISSUED",
    "createdAt": "ISO_DATETIME",
    "pdf": {
      "bucket": "string",
      "objectKey": "tenants/{tenantId}/invoices/INV-2026-000001.pdf"
    }
  }
}

2.5 POST /api/invoices/{invNumber}/pdf

Mints a signed URL.

Request: none

Response 200 (JSON):

{
  "bucket": "string",
  "objectKey": "tenants/{tenantId}/invoices/INV-2026-000001.pdf",
  "ttlSeconds": 600,
  "expiresAt": "ISO_DATETIME",
  "url": "https://..."
}

2.6 GET /api/receipts/{rcpNumber}

Response 200 (JSON):

{
  "receipt": {
    "rcpNumber": "RCP-2026-000001",
    "ordId": "ORD-20260125-AB12",
    "invNumber": "INV-2026-000001",
    "createdAt": "ISO_DATETIME",
    "pdf": {
      "bucket": "string",
      "objectKey": "tenants/{tenantId}/receipts/RCP-2026-000001.pdf"
    }
  }
}

2.7 POST /api/receipts/{rcpNumber}/pdf

Response 200 (JSON):

{
  "bucket": "string",
  "objectKey": "tenants/{tenantId}/receipts/RCP-2026-000001.pdf",
  "ttlSeconds": 600,
  "expiresAt": "ISO_DATETIME",
  "url": "https://..."
}

3. Stripe Webhook
3.1 POST /api/webhooks/stripe

Request: raw body from Stripe (not JSON-parsed before signature check)

Response 200 (JSON):

{
  "received": true
}


Errors:

WEBHOOK_SIGNATURE_INVALID

Rules (locked):

Only checkout.session.completed triggers receipt + entitlements.

Event must be idempotent (Stripe event id stored).

4. Licensing
4.1 GET /api/licences

Returns user licences.

Response 200 (JSON):

{
  "licences": [
    {
      "licKey": "LIC-AB12-CD34-EF56",
      "status": "ACTIVE",
      "activated": true,
      "createdAt": "ISO_DATETIME"
    }
  ]
}

4.2 GET /api/licences/{licKey}

Response 200 (JSON):

{
  "licence": {
    "licKey": "LIC-AB12-CD34-EF56",
    "status": "ACTIVE",
    "activated": true,
    "createdAt": "ISO_DATETIME",
    "activation": {
      "deviceId": "hash",
      "activatedAt": "ISO_DATETIME"
    }
  }
}


Errors:

LICENCE_NOT_FOUND

4.3 POST /api/licences/validate

Request (JSON):

{
  "licKey": "LIC-AB12-CD34-EF56",
  "device": {
    "deviceId": "string (client-generated stable id)",
    "platform": "string",
    "appVersion": "string"
  }
}


Response 200 (JSON):

{
  "valid": true,
  "licKey": "LIC-AB12-CD34-EF56",
  "activated": true,
  "entitlements": [
    {
      "releaseId": "uuid"
    }
  ],
  "offlineGrace": {
    "allowed": true,
    "days": 7
  }
}


Errors:

LICENCE_NOT_FOUND

VALIDATION_ERROR

4.4 POST /api/licences/activate

Request (JSON):

{
  "licKey": "LIC-AB12-CD34-EF56",
  "device": {
    "deviceId": "string (client-generated stable id)",
    "platform": "string",
    "appVersion": "string"
  }
}


Response 200 (JSON):

{
  "activated": true,
  "licKey": "LIC-AB12-CD34-EF56",
  "activation": {
    "deviceId": "hash",
    "activatedAt": "ISO_DATETIME"
  }
}


Errors:

LICENCE_NOT_FOUND

LICENCE_MAX_ACTIVATIONS

VALIDATION_ERROR

5. Storage (Signed URLs Only)
5.1 POST /api/storage/signed-url

Request (JSON):

{
  "bucket": "string",
  "objectKey": "string",
  "ttlSeconds": 600,
  "contentType": "string (optional)",
  "contentDisposition": "string (optional)"
}


Response 200 (JSON):

{
  "bucket": "string",
  "objectKey": "string",
  "ttlSeconds": 600,
  "expiresAt": "ISO_DATETIME",
  "url": "https://..."
}


Errors:

FORBIDDEN_OBJECT_KEY

VALIDATION_ERROR

6. Releases & Downloads
6.1 GET /api/releases

Response 200 (JSON):

{
  "releases": [
    {
      "id": "uuid",
      "slug": "string",
      "title": "string",
      "version": "string",
      "createdAt": "ISO_DATETIME"
    }
  ]
}

6.2 GET /api/account/downloads

Response 200 (JSON):

{
  "downloads": [
    {
      "releaseId": "uuid",
      "title": "string",
      "version": "string"
    }
  ]
}

6.3 POST /api/account/downloads/{releaseId}/signed-url

Request (JSON):

{
  "licKey": "LIC-AB12-CD34-EF56"
}


Response 200 (JSON):

{
  "bucket": "string",
  "objectKey": "tenants/{tenantId}/releases/{releaseId}/{filename}",
  "ttlSeconds": 600,
  "expiresAt": "ISO_DATETIME",
  "url": "https://..."
}


Errors:

ENTITLEMENT_REQUIRED

LICENCE_REQUIRED

LICENCE_INVALID

VALIDATION_ERROR

7. Booking
7.1 POST /api/bookings

Request (JSON):

{
  "fullName": "string",
  "email": "user@example.com",
  "serviceSlug": "string",
  "preferredAt": "ISO_DATETIME",
  "notes": "string (optional)"
}


Response 201 (JSON):

{
  "bkgRef": "BKG-1A2B3C4D",
  "status": "NEW",
  "createdAt": "ISO_DATETIME"
}


Errors:

SERVICE_NOT_FOUND

VALIDATION_ERROR

7.2 GET /api/bookings/track?bkgRef=...&email=...

Response 200 (JSON):

{
  "booking": {
    "bkgRef": "BKG-1A2B3C4D",
    "status": "CONFIRMED",
    "createdAt": "ISO_DATETIME",
    "customer": {
      "fullName": "string",
      "email": "user@example.com"
    },
    "service": {
      "serviceSlug": "string",
      "serviceNameSnapshot": "string",
      "priceSnapshot": 5000,
      "currency": "GBP"
    },
    "preferredAt": "ISO_DATETIME",
    "timeline": [
      { "status": "NEW", "at": "ISO_DATETIME" },
      { "status": "CONFIRMED", "at": "ISO_DATETIME" }
    ],
    "notes": "string (optional)"
  }
}


Errors:

BOOKING_NOT_FOUND

VALIDATION_ERROR

8. Admin Booking
8.1 GET /api/admin/bookings

Requires role ADMIN (or STAFF if you choose later; default is ADMIN only unless stated otherwise).

Response 200 (JSON):

{
  "bookings": [
    {
      "bkgRef": "BKG-1A2B3C4D",
      "status": "NEW",
      "createdAt": "ISO_DATETIME",
      "email": "user@example.com",
      "fullName": "string",
      "serviceSlug": "string"
    }
  ]
}


Errors:

FORBIDDEN

8.2 PATCH /api/admin/bookings/{bkgRef}

Update booking status.

Request (JSON):

{
  "status": "CONFIRMED"
}


Response 200 (JSON):

{
  "booking": {
    "bkgRef": "BKG-1A2B3C4D",
    "status": "CONFIRMED",
    "updatedAt": "ISO_DATETIME"
  }
}


Errors:

FORBIDDEN

BOOKING_NOT_FOUND

INVALID_STATUS_TRANSITION

VALIDATION_ERROR

9. Status Enums (LOCKED)
9.1 Order.status

PENDING_PAYMENT

PAID

FAILED

CANCELLED

9.2 Booking.status

NEW

CONFIRMED

IN_PROGRESS

COMPLETED

CANCELLED

9.3 Licence.status

ACTIVE

REVOKED

10. Identifier Validation Patterns (LOCKED)

ORD: ^ORD-[0-9]{8}-[A-Z0-9]{4}$

INV: ^INV-[0-9]{4}-[0-9]{6}$

RCP: ^RCP-[0-9]{4}-[0-9]{6}$

LIC: ^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$

BKG: ^BKG-[A-Z0-9]{8}$

11. Notes on Defaults (LOCKED)

Currency default: GBP

Signed URL TTL: 600

Offline grace for licence validation: 7 days

Admin booking endpoints: ADMIN-only by default

12. Approval

This document is approved and must be treated as the sole source of truth for API request/response shapes.
Any change requires a versioned update and explicit re-a