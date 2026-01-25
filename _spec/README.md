# Prime Tech Platform

This repository contains the full source code and specifications for the Prime Tech Services platform.

## Structure

```
prime-tech-platform/
├── _spec/                     # Authoritative specifications
│   ├── CODEX_HANDOFF_v1.md     # Backend authoritative spec (you will add)
│   ├── FRONTEND_HANDOFF_v1.pdf # Frontend authoritative spec
│   └── CODEX_EXECUTION_PLAN_v1.md
├── backend/                   # Backend services (Node.js / Prisma)
├── frontend/                  # Frontend (Next.js)
├── docker/                    # Docker and deployment configs
├── docs/                      # Supplementary documentation
└── README.md
```

## Rules

- `_spec/` is the source of truth.
- No implementation may diverge from the specs.
- Codex must follow `CODEX_EXECUTION_PLAN_v1.md`.
- No undocumented routes, fields, or logic allowed.

## Status

- Frontend specification: ✅ approved
- Execution plan: ✅ approved
- Backend handoff spec: ⬜ add `CODEX_HANDOFF_v1.md` to `_spec/` before backend implementation begins
