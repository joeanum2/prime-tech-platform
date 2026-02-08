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
