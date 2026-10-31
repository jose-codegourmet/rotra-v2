# @rotra/db — server-only Prisma package

- **Server-only.** Every module imports `server-only`; never import `@rotra/db/*` from a client
  component, `@rotra/ui`, or `@rotra/data`.
- **Split schema.** `prisma/schema/base.prisma` holds only the generator and datasource. Models live in
  `prisma/schema/{admin,queue,player}/<entity-group>.prisma`. Never one `schema.prisma`.
- **Two connections.** `DATABASE_URL` (pooled, runtime role) for the apps; `DIRECT_URL` (migration role)
  for the CLI via `prisma.config.ts`. Neither is ever `NEXT_PUBLIC_`.
- **No silent DDL.** `pnpm --filter @rotra/db db:migrate:draft --name <name>` writes SQL for review only.
  Applying a migration needs human sign-off (coding-conventions §13). Do not use `db push` or
  `migrate deploy` against a shared project.
- **Generated client** goes to `src/generated/prisma` (gitignored). Run `db:generate` after install
  or schema changes.

- **Service boundary.** Route Handlers call `handleAccountRequest` / `handlePublicRead`
  (`src/service/handler.ts`) and authorize scope with `src/service/authorize.ts`. Return bodies built
  from allowlisted fields (`pick`, `toMoney`, `toIso`…); never a Prisma result object. See
  architecture §8.
- **Draft SQL.** Each ticket's migration folder holds `prisma migrate diff` output plus hand-written
  CHECKs, partial uniques and triggers Prisma cannot express. Keys, checks and grants are listed in
  [physical-schema.md](../../docs/database_design/product/physical-schema.md).

Commands (load nvm first):

```bash
nvm use && pnpm --filter @rotra/db db:generate
nvm use && pnpm --filter @rotra/db db:validate
nvm use && pnpm --filter @rotra/db db:migrate:draft --name <name>
nvm use && pnpm --filter @rotra/db db:migrate:status
```
