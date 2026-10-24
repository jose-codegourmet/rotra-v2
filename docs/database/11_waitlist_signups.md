# 11 — Waitlist signups (`waitlist_signups`)

## Overview

Public marketing signups from the **coming-soon landing** (`apps/landing`). Rows are written **only from server-side code** (Next.js Route Handler using Prisma from [`packages/db/src/index.ts`](../../packages/db/src/index.ts)), not from browser clients talking to PostgREST.

The **Admin app** (`apps/admin`) lists signups on the **Waitlist** page with pagination (TanStack Table + React Query calling `GET /api/waitlist`).

---

## Table: `waitlist_signups`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Default `gen_random_uuid()` via Prisma at insert |
| `email` | `text` NOT NULL UNIQUE | Stored **normalized**: trim + lowercase (application layer) |
| `created_at` | `timestamptz` NOT NULL | Default `now()` |

### Behaviour

- **Duplicate email:** The unique constraint on `email` prevents multiple rows per address. The landing API treats a duplicate signup as **success** (same HTTP 200 success payload as a new insert) so users never see an “already on the list” error.
- **RLS:** When enabling Row Level Security on Supabase, align policies with [`09_rls_and_realtime.md`](09_rls_and_realtime.md). Typical pattern: no direct anonymous access; writes go through the server using the database role used by Prisma.

### Indexes

```sql
CREATE UNIQUE INDEX waitlist_signups_email_key ON waitlist_signups(email);
CREATE INDEX idx_waitlist_signups_created ON waitlist_signups(created_at DESC);
```

### Prisma model

`WaitlistSignup` in [`packages/db/prisma/models_waitlist.prisma`](../../packages/db/prisma/models_waitlist.prisma).
