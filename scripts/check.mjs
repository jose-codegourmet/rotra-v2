// `make check`: lint, type-check, build, then the decided-math tests.
// Each step runs quietly; the first failure prints the tail of its output and exits non-zero.
// Run through `make check` so nvm has already picked the Node version from .nvmrc.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { computeFingerprint } from '../packages/rules-wasm/fingerprint.mjs'

// Vitest files for rules the owner has decided: session cost, minimum games,
// payment status and totals, substitution game credit, rank eligibility and award baselines.
const DECIDED_MATH_TESTS = [
  'src/session-cost/sessionCost.rules.test.ts',
  'src/session-payment/sessionPayment.rules.test.ts',
  'src/match/match.rules.test.ts',
  'src/session-result/sessionResult.rules.test.ts',
  'src/player/player.rules.test.ts',
  'src/leaderboard/leaderboard.rules.test.ts',
  'src/queue-session/queueSession.rules.test.ts',
]

// The shared queue rule cases (`@rotra/rule-cases`): every JSON case against today's TypeScript
// rules, and every case file against its schema.
const RULE_CASE_TESTS = ['src/rule-cases/']

// The committed rules .wasm must come from the Go rule files in this checkout (rule-cases G15). The hash of
// those files is recomputed here in Node, so this gate needs no Go. Rebuild with `make wasm` in apps/api.
function checkRulesFingerprint() {
  const recorded = readFileSync(
    new URL('../packages/rules-wasm/wasm/rules.fingerprint', import.meta.url),
    'utf8',
  ).trim()
  if (computeFingerprint() === recorded) return
  console.error('── rules .wasm is stale ──')
  console.error('The Go rule files (apps/api/internal/rules, cmd/ruleswasm) changed since the')
  console.error(
    'committed packages/rules-wasm/wasm/ was built. Run `make wasm` in apps/api and commit it.',
  )
  console.error('check: FAILED at rules fingerprint')
  process.exit(1)
}
checkRulesFingerprint()

const STEPS = [
  ['lint', 'pnpm', ['lint', '--output-logs=errors-only']],
  ['type-check', 'pnpm', ['type-check', '--output-logs=errors-only']],
  ['build', 'pnpm', ['build', '--output-logs=errors-only']],
  [
    'test',
    'pnpm',
    [
      '--filter',
      '@rotra/data',
      'exec',
      'vitest',
      'run',
      ...DECIDED_MATH_TESTS,
      ...RULE_CASE_TESTS,
      '--reporter=dot',
    ],
  ],
  [
    'rules wasm',
    'pnpm',
    ['--filter', '@rotra/rules-wasm', 'exec', 'vitest', 'run', '--reporter=dot'],
  ],
  [
    'rule-case schema',
    'pnpm',
    [
      '--filter',
      '@rotra/schema',
      'exec',
      'vitest',
      'run',
      'src/rule-cases.test.ts',
      '--reporter=dot',
    ],
  ],
]

const TAIL_LINES = 40

for (const [name, cmd, args] of STEPS) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0', TURBO_UI: 'false' },
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
    const tail = output.trimEnd().split('\n').slice(-TAIL_LINES).join('\n')
    console.error(`── ${name} failed (last ${TAIL_LINES} lines) ──`)
    console.error(tail)
    console.error(`check: FAILED at ${name}`)
    process.exit(1)
  }
}

console.log('check: OK')
