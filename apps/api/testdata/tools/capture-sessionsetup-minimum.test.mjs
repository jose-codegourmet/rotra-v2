// Captures estimateMinimum and sessionMinutes of packages/data/src/queue-session/queueSession.rules.ts (no Vitest cases pin them)
// by running the real functions over a grid of inputs, for the Go port in internal/rules/sessionsetup.
//
//   source ~/.nvm/nvm.sh && nvm use
//   node node_modules/.pnpm/vitest@*/node_modules/vitest/vitest.mjs run --config apps/api/testdata/tools/vitest.capture.config.mjs apps/api/testdata/tools/capture-sessionsetup-minimum.test.mjs
//
// Output: apps/api/internal/rules/sessionsetup/testdata/minimum.golden.json (commit it).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'vitest'
import { estimateMinimum, sessionMinutes } from '../../../../packages/data/src/queue-session/queueSession.rules.ts'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../internal/rules/sessionsetup/testdata/minimum.golden.json')

test('minimum', () => {
  const minutes = []
  for (const [start, end] of [[0, 3600000], [0, 7200000], [3600000, 0], [5, 5], [0, 14400000], [81000000, 3600000], [0, 1500000], [0, 899999], [0, 1199999]])
    minutes.push({ start, end, minutes: sessionMinutes(start, end) })
  const estimates = []
  for (const courts of [0, 1, 2, 3, 4, 8])
    for (const players of [0, 1, 2, 3, 4, 5, 7, 8, 12, 16, 24, 31])
      for (const [allowSingles, allowDoubles] of [[true, true], [false, true], [true, false], [false, false]])
        for (const mins of [0, 14, 15, 19, 20, 39, 40, 59, 60, 90, 120, 180, 240, 720, 1439])
          estimates.push({ in: { courts, players, minutes: mins, allowSingles, allowDoubles }, out: estimateMinimum({ courts, players, minutes: mins, allowSingles, allowDoubles }) })
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify({ minutes, estimates }, null, 1)}\n`)
})
