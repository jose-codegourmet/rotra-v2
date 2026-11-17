// Vitest config for the capture-*.test.mjs scripts only. Nothing here runs in `make check`.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')

export default {
  root,
  resolve: {
    // The Route Handlers import `@rotra/db/<path>`; each export maps to packages/db/src/<path>.ts, except the few listed.
    alias: [
      { find: 'server-only', replacement: `${here}/empty-module.mjs` },
      { find: 'next/headers', replacement: `${here}/next-headers-stub.mjs` },
      { find: /^@rotra\/db\/(.*)$/, replacement: `${root}/packages/db/src/$1` },
    ],
  },
  test: { include: ['apps/api/testdata/tools/capture-leaderboard.test.mjs', 'apps/api/testdata/tools/capture-playerpages.test.mjs', 'apps/api/testdata/tools/capture-clubpage.test.mjs', 'apps/api/testdata/tools/capture-publicsession.test.mjs', 'apps/api/testdata/tools/capture-claim.test.mjs', 'apps/api/testdata/tools/capture-recovery.test.mjs'], testTimeout: 120_000, hookTimeout: 120_000 },
}
