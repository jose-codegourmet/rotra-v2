# Prisma migrations and Supabase

This guide describes how ROTRA applies **Prisma** schema changes to **Supabase Postgres** in this monorepo.

## Prerequisites

- A Supabase project (dev/staging/prod as needed).
- [`packages/db/.env`](../../packages/db/.env) (not committed) with:
  - **`DATABASE_URL`** — connection string for **Prisma Client** via Supabase’s **transaction pooler** (PgBouncer), usually port **6543**. Prisma requires **`pgbouncer=true`** on that URL so prepared statements do not collide on the pooler (Postgres **`08P01`** bind/prepared-statement errors). **`@rotra/db` appends this automatically** when the URL looks like the tx pooler (port `6543` or `*.pooler.supabase.com`); you can also add it explicitly (see [Prisma: PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer), [Prisma: Supabase](https://www.prisma.io/docs/orm/overview/databases/supabase)).
  - **`DIRECT_URL`** — **direct** Postgres connection (port **5432**) for migrations and introspection. Prisma uses this via `directUrl` in [`packages/db/prisma/schema.prisma`](../../packages/db/prisma/schema.prisma).

Copy values from Supabase **Project Settings → Database** (connection strings / URI).

## How commands run in this repo

Prisma’s schema lives under `packages/db/prisma/`. From the **repository root**, use:

| Command | When to use |
| --- | --- |
| `pnpm db:generate` | Regenerate `@prisma/client` after schema or migration changes. |
| `pnpm db:push` | Push schema to the database **without** creating migration files (quick experiments only). |
| `pnpm db:migrate` | **Local development:** create/apply migrations interactively (`prisma migrate dev`). |
| `pnpm db:migrate:deploy` | **CI / hosted environments:** apply existing migrations only (`prisma migrate deploy`). No prompts. |
| `pnpm db:studio` | Open Prisma Studio against the database configured in `packages/db/.env`. |
| `pnpm db:seed` | Run the Prisma seed script (reference data; idempotent upserts). |
| `pnpm db:migrate:reset` | **Destructive:** drop schema, re-apply migrations, run seed. Disposable dev DBs only. |

These scripts run in the `@rotra/db` package context, so Prisma loads **`packages/db/.env`** automatically. You do not need a root `.env` for these commands.

## Seeding

Reference data for local and preview databases lives in [`packages/db/prisma/seed.ts`](../../packages/db/prisma/seed.ts). It uses **`upsert`** on stable unique keys so **`pnpm db:seed`** is safe to run multiple times.

**Prerequisites:** Apply the schema first (`pnpm db:migrate`, `pnpm db:migrate:deploy`, or `pnpm db:push`) so tables such as `skill_dimensions` and `ranking_tier_config` exist.

**Command:** from the repo root, `pnpm db:seed` (or `pnpm --filter @rotra/db db:seed`).

**Source of truth for row content:** [05_reviews_and_ratings.md](05_reviews_and_ratings.md) (skill dimensions) and [06_gamification.md](06_gamification.md) (ranking tiers). When product changes those catalogs, update the doc and the seed arrays in `seed.ts` together.

**Environments:** Prefer seeding **development** and optionally **staging**. For **production**, only run seeds when your team explicitly wants idempotent reference data applied there; avoid ad hoc seeds that insert user-specific or environment-specific rows without review.

**Optional (destructive):** `pnpm db:migrate:reset` drops the database, reapplies all migrations, and runs the seed (Prisma default after reset). Use only on disposable local databases.

**Not covered by the current seed:** `profiles` / `auth.users`, `kill_switches`, `platform_config`, and other environment- or user-specific data. Add more `upsert` blocks in `seed.ts` as those needs become clear.

## Day-to-day workflow (development)

1. Edit the Prisma schema files under `packages/db/prisma/` (split across `schema.prisma`, `models_*.prisma`, `enums.prisma`, etc.).
2. Run **`pnpm db:migrate`** from the repo root. Name the migration when prompted.
3. Commit the new folder under `packages/db/prisma/migrations/` with your code.
4. Run **`pnpm db:generate`** if your editor or CI needs a fresh client (often `postinstall` already runs `prisma generate` in `@rotra/db`).

## `db:push` vs `db:migrate`

| Approach | Use when |
| --- | --- |
| **`pnpm db:push`** | Throwaway branches or spikes; no migration history in git. |
| **`pnpm db:migrate`** | Anything that should ship: reproducible schema, reviewable SQL, deployable to preview/prod. |

## Deploy (preview / production)

1. Set `DATABASE_URL` and `DIRECT_URL` in the **hosting or CI environment** for the target Supabase project (same semantics as local `packages/db/.env`).
2. Run **`pnpm db:migrate:deploy`** in CI or a release step after dependencies are installed.

Do **not** run `prisma migrate dev` against production databases; it can reset or prompt in ways unsafe for shared environments.

## What Prisma does not own (ROTRA conventions)

Align with comments in `schema.prisma` and [09_rls_and_realtime.md](09_rls_and_realtime.md):

- **Foreign keys to `auth.users`** — intentionally omitted from Prisma so migrate does not require the `auth` schema; enforce in real DDL / Supabase SQL if needed.
- **CHECK constraints** — documented in table specs; may be applied via SQL migrations or the Supabase SQL editor.
- **RLS policies, triggers, Realtime** — managed as Supabase/Postgres concerns; see [09_rls_and_realtime.md](09_rls_and_realtime.md).

Use Prisma migrations for tables, columns, indexes, and enums that Prisma models. Add companion SQL migrations or manual steps in Supabase when you need auth linkage, RLS, or triggers.

## Apps vs `packages/db/.env`

- **`apps/client`** and **`apps/admin`** use **`NEXT_PUBLIC_SUPABASE_URL`** and the Supabase **anon** (or publishable) key in each app’s `.env.local` for Auth, PostgREST, etc. That is separate from Prisma’s `DATABASE_URL`.
- If a Next.js **Route Handler** or **Server Action** instantiates Prisma at runtime, that process must receive **`DATABASE_URL`** and **`DIRECT_URL`** in its own environment (e.g. Vercel env vars or the app’s `.env.local`), not only inside `packages/db/.env`, which is used when you run Prisma CLI from the repo.

## Optional: Supabase-generated TypeScript types

For PostgREST-shaped types (separate from the Prisma client), the `@rotra/db` package includes a placeholder script:

```bash
pnpm --filter @rotra/db db:types:supabase
```

Follow the echoed instructions to run `supabase gen types` and write [`packages/db/src/supabase-database.types.ts`](../../packages/db/src/supabase-database.types.ts).

## Further reading

- [Database README](README.md) — schema index and design principles.
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/workflows)
