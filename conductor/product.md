# Product — ROTRA backend

> Conductor here covers the **backend only**: the Go API on Railway decided in
> [D-2026-11-13-01](../docs/mvp/decisions.md#d-2026-11-13-01). The product itself is described in
> [AGENTS.md](../AGENTS.md) §1 and [business logic](../docs/business_logic/product/README.md); those win
> over this page.

## What ROTRA is

A badminton session operating system for club nights. *Run the game.* Three v1 products: **Queue**
(`apps/queue`, run by the Queue Master), **Player Information** (`apps/player`) and **Admin**
(`apps/admin`). Utility software, not a social network.

## What this backend work delivers

Moving the server side from Next.js Route Handlers + `packages/db` (Prisma, Supabase) to **one Go
API on Railway**, area by area, with:

- the same screens, hooks and JSON contracts; mock mode stays the default
- Railway Postgres and Railway Buckets instead of Supabase
- sign-in owned by the Go API: club usernames, player email, Admin; device list, rate limits,
  offline device enrollment
- **live updates** for every app, with the existing refresh kept as the fallback
- the Queue offline contract unchanged (`operationId`, revisions, `GET /api/sync`, roster batch)

Decisions and their reasons: [backend docs](../docs/backend/README.md),
[backend open decisions](../docs/backend/open-decisions.md).

## Users of this backend

The three Next.js apps (through each app's `/api/*` rewrite) and, through them, Queue Masters,
players, visitors and the platform owner.

## Out of scope

- Frontend features and screens: they follow the mockup-first process in AGENTS.md
- Scheduled jobs (parked, D-2026-11-11-10)
- The device-stream protocol beyond enrollment (`uploadOperations`, `sealStream`)
- Anything in [product terms §14](../docs/product-terms.md#14-words-that-mean-not-v1--stop-and-ask)
