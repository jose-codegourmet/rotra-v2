// Captures what the Admin write routes (POST, PATCH) put on the wire and leave in the database, by running the real
// Admin Route Handlers (apps/admin/src/app/api) and the real @rotra/db services (Prisma) against a throwaway local
// Postgres. The harness is capture-writes-base.mjs; the Go side is apps/api/internal/writetest. Groups so far:
//   flags   POST /api/feature-flags   PATCH /api/feature-flags/{key}
//
//   docker run -d --rm --name rotra-capture-pg -e POSTGRES_PASSWORD=test -p 127.0.0.1:55439:5432 postgres:16-alpine
//   source ~/.nvm/nvm.sh && nvm use
//   ROTRA_CAPTURE_DB_URL=postgres://postgres:test@127.0.0.1:55439/postgres \
//     node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-writes-admin.test.mjs
//
// Refuses any host but 127.0.0.1/localhost. It creates its own database (rotra_capture_<n>) and drops it.
// Output: apps/api/internal/adminwrites/testdata/<group>.golden.json (commit it). To add a group, add its cases
// file there (see the doc of internal/writetest) and one `test(...)` below.
//
// Only the Supabase session check is replaced: verifySubject answers the step's subject (a step with none is signed
// out), so loadAccountContext (the active-admin check) and every service run for real.
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, test, vi } from 'vitest'
import { captureWrites, openCaptureDb, root } from './capture-writes-base.mjs'

vi.mock('../../../../packages/db/src/auth/supabase.ts', async (importOriginal) => ({
  ...(await importOriginal()),
  verifySubject: async () => {
    const { currentSubject } = await import('./capture-writes-base.mjs')
    const subject = currentSubject()
    return subject ? { provider: 'supabase', subject } : null
  },
}))

const here = dirname(fileURLToPath(import.meta.url))
const testdata = resolve(here, '../../internal/adminwrites/testdata')
const apiDir = resolve(root, 'apps/admin/src/app/api')

let capture
beforeAll(async () => {
  capture = await openCaptureDb()
})
afterAll(async () => {
  await capture?.close()
})

test('flags', async () => {
  await captureWrites({ db: capture.db, testdata, name: 'flags', apiDir })
})
