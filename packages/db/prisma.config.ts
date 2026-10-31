import { defineConfig } from 'prisma/config'

/**
 * Migration and CLI configuration only. The CLI uses the direct (session) connection;
 * the runtime client in `src/client/prisma.ts` uses the pooled `DATABASE_URL`.
 * `db:migrate:draft` writes SQL for review and never applies it. The CLI does not load `.env`;
 * export `DIRECT_URL` in the shell. `generate` and `validate` work without it.
 */
export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
})
