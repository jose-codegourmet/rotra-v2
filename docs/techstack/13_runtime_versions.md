# Runtime Versions & Hosting

This document is the runtime contract for local development, CI, and deployment.

## Local Runtime Contract

- **Node.js:** 24.x LTS (`.nvmrc` is pinned to `v24`; `engines.node` in root `package.json` is `>=24`)
- **pnpm:** 11.0.8 (`packageManager` in root `package.json`; `engines.pnpm` is `>=11`)
- **Switching command:** `nvm use` (used by all `Makefile` commands before running `pnpm`)

## Tooling Versions

- **Biome:** `^2.4.10` (workspace linting via `biome.json`, app `lint` / `check:fix` scripts)
- **Prettier:** `^3.5.3` (root formatting)
- **TypeScript:** `^5.8.3` (workspace + apps/packages `type-check`)
- **Turborepo:** `latest` (task orchestration for `dev`, `build`, `lint`, `type-check`)
- **Husky + commitlint:** `^9.x` + `^20.x` (commit hooks and commit message enforcement)

## App Runtime Stack

- **Next.js:** `^15.2.4` (App Router for all apps)
- **React:** `^19.1.0`
- **Tailwind CSS:** `^4.1.3`
- **Prisma:** `^6.19.3`
- **Storybook:** `^10.3.4`
- **`@types/node`:** `^24.0.0` (apps and `packages/db`)

## Vercel Runtime

- Each app deploys as its own Vercel project: `landing`, `client`, `admin`, `umpire`.
- Set **Build and Deployment -> Node.js Version** to **24.x** in each Vercel project.
- Install command: `pnpm install --frozen-lockfile`.
- Build command: `pnpm build` (Turborepo orchestrates app builds).
- No `vercel.json` is committed in this repo; project runtime settings are managed in the Vercel dashboard.
- Server-side routes run on Vercel Node runtime; no app currently pins `export const runtime = "edge"`.

## Supabase Runtime

- **Supabase Postgres** is the primary database.
- **Prisma** uses `DATABASE_URL` (pooler) and `DIRECT_URL` (direct/migrations).
- **Supabase Auth** handles Facebook OAuth (client) and email + TOTP MFA (admin).
- **Supabase Realtime** powers row-change subscriptions (queue/score update flows).
- **Supabase Storage** is used for player profile photos.
- **RLS** is enabled broadly; admin server operations use the service-role key server-side only.

## CI Runtime

- GitHub Actions workflow uses Node from `.nvmrc` (`actions/setup-node@v4` with `node-version-file`).
- pnpm is pinned via `pnpm/action-setup@v4` with version `11.0.8`.
