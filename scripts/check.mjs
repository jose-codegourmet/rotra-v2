// `make check`: lint, type-check, build, then the decided-math tests.
// Each step runs quietly; the first failure prints the tail of its output and exits non-zero.
// Run through `make check` so nvm has already picked the Node version from .nvmrc.
import { spawnSync } from 'node:child_process'

// Vitest files for rules the owner has decided: session cost, minimum games,
// payment status and totals, substitution game credit, rank eligibility and award baselines.
const DECIDED_MATH_TESTS = [
  'src/session-cost/sessionCost.rules.test.ts',
  'src/match/match.rules.test.ts',
  'src/ruleCases.rules.test.ts',
]

const STEPS = [
  ['lint', 'pnpm', ['lint', '--output-logs=errors-only']],
  ['type-check', 'pnpm', ['type-check', '--output-logs=errors-only']],
  ['build', 'pnpm', ['build', '--output-logs=errors-only']],
  [
    'test',
    'pnpm',
    ['--filter', '@rotra/data', 'exec', 'vitest', 'run', ...DECIDED_MATH_TESTS, '--reporter=dot'],
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
