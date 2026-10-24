## Summary Table

| Concern | Technology | Notes |
|---------|------------|-------|
| Monorepo | Turborepo + pnpm | Parallel builds, remote caching, workspace packages |
| Runtime | Node.js 24 LTS + pnpm 11 | Pinned via `.nvmrc` + root `packageManager`; see `13_runtime_versions.md` |
| Framework | Next.js 15 (App Router) | All three apps |
| Language | TypeScript 5 | Strict mode; shared types via `@rotra/db` |
| Styling | Tailwind CSS 4 + shadcn/ui | Dark mode only; ROTRA tokens in shared config |
| Component library | Per-app components (shadcn/ui) | Each app owns its own `src/components/` |
| Server state | React Query v5 | Client + Admin apps |
| Client state | Redux Toolkit | Client app (session), Umpire app (local score) |
| Data tables | TanStack Table v8 | Admin app only |
| ORM | Prisma 6 | Shared via `@rotra/db` |
| Database | Supabase (Postgres) | RLS for multi-tenancy |
| Real-time | Supabase Realtime (DB row subscriptions) | Smart monitoring alert + score submission notification only |
| Auth (players + admin) | Supabase Auth | Facebook OAuth (players); email + MFA (admin) |
| Auth (umpire guest) | One-time DB token | Looked up in Next.js middleware |
| Deployment | Vercel (3 projects) | Separate deploys per app |
| Storage | Supabase Storage | Player profile photos |
| Component dev | Storybook | `apps/client` + `apps/admin` + `apps/umpire` (each app-local) |
