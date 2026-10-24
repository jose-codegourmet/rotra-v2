# AGENTS.md — `@rotra/db`

> Nested entry for `packages/db`. Root: `/AGENTS.md` · Detail: `.agents/context/data-layer.md`.

## Layout

- Prisma: `prisma/*.prisma` (split schemas; 36 models) + `prisma/migrations/` (15)
- Services: `src/<feature>-service.ts` (10 today)
- Entrypoints: `@rotra/db` → `src/index.ts` (sanctioned barrel); `@rotra/db/client` → client-safe only

## Rules

- Domain logic belongs in services; thin routes call services.
- Many session/places/onboarding/waitlist writes still bypass services — prefer services for new non-trivial logic.
- RLS: **`places` only** in applied migrations. Do not assume other tables have RLS.
- Migrations are effectively irreversible; treat schema changes as Large work (`docs/ways-of-working.md`).
- Never import Prisma into `"use client"` modules — use `@rotra/db/client` for types/utils.

## Commands

From repo root: `pnpm db:generate | db:push | db:migrate | db:studio | db:seed`.
