// Push the Supabase/database env vars from the root .env to the shared Vercel Services project.
// Dry run by default; pass --apply to write. Values travel through stdin only and are never printed.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'DATABASE_PW',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWKS_URL',
]
// Stored as Vercel "sensitive" in production and preview (Vercel does not allow it for development).
const SENSITIVE = new Set(['DATABASE_PW', 'DATABASE_URL', 'DIRECT_URL', 'SUPABASE_SECRET_KEY'])
const TARGETS = ['production', 'preview', 'development']
const DEFAULT_CLI = ['pnpm', 'dlx', 'vercel@65.5.0']

const root = fileURLToPath(new URL('../', import.meta.url))

function fail(message) {
  console.error(`sync-vercel-env: ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const options = {
    apply: false,
    envFile: `${root}.env`,
    targets: [],
    project: 'rotra-v2-queue',
    scope: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => {
      const value = argv[++i]
      if (!value || value.startsWith('--')) fail(`${arg} needs a value`)
      return value
    }
    if (arg === '--apply') options.apply = true
    else if (arg === '--env-file') options.envFile = next()
    else if (arg === '--target') options.targets.push(...next().split(','))
    else if (arg === '--project') options.project = next()
    else if (arg === '--scope') options.scope = next()
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/sync-vercel-env.mjs [--apply] [--env-file <path>]\n' +
          '  [--target <production|preview|development>]... [--project <name>] [--scope <team>]\n' +
          'Dry run unless --apply. CLI: pnpm dlx vercel@65.5.0 (override with VERCEL_CLI).',
      )
      process.exit(0)
    } else fail(`unknown argument ${arg}`)
  }
  options.targets = [...new Set(options.targets.map((t) => t.trim()).filter(Boolean))]
  if (options.targets.length === 0) options.targets = ['production', 'preview']
  for (const target of options.targets) {
    if (!TARGETS.includes(target)) fail(`unknown target "${target}" (use ${TARGETS.join(', ')})`)
  }
  return options
}

// KEY=VALUE lines only; comments and blanks ignored; one pair of matching outer quotes stripped.
function parseEnvFile(path) {
  if (!existsSync(path)) fail(`env file not found: ${path}`)
  const values = new Map()
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line)
    if (!match) continue
    let value = match[2].trim()
    const quote = value[0]
    if (value.length >= 2 && (quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1)
    }
    values.set(match[1], value)
  }
  return values
}

const options = parseArgs(process.argv.slice(2))
const env = parseEnvFile(options.envFile)
const missing = KEYS.filter((key) => !env.get(key))
if (missing.length > 0) fail(`missing or empty in ${options.envFile}: ${missing.join(', ')}`)

// Every value from the env file (and its URL-encoded form) is scrubbed from CLI output we print.
const secrets = [...env.values()]
  .flatMap((value) => [value, encodeURIComponent(value)])
  .filter((value) => value.length >= 4)
  .sort((a, b) => b.length - a.length)
function scrub(text) {
  let out = text ?? ''
  for (const secret of secrets) out = out.split(secret).join('[redacted]')
  return out.trim()
}

const cli = process.env.VERCEL_CLI
  ? process.env.VERCEL_CLI.split(/\s+/).filter(Boolean)
  : DEFAULT_CLI
const scopeArgs = options.scope ? ['--scope', options.scope] : []
function vercel(args, input) {
  const result = spawnSync(cli[0], [...cli.slice(1), ...args, ...scopeArgs], {
    cwd: root,
    input: input ?? '',
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
  if (result.error) fail(`could not run ${cli.join(' ')}: ${result.error.message}`)
  return result
}
// pnpm dlx progress lines share stdout; keep only CLI lines worth showing.
function cliMessage(result) {
  return scrub(`${result.stderr}\n${result.stdout}`)
    .split('\n')
    .filter((line) => !/^(Progress:|Packages:|\+{3,}|\[WARN\])/.test(line.trim()))
    .join('\n')
    .trim()
}

function linkedProject() {
  const file = `${root}.vercel/project.json`
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, 'utf8')).projectName
  } catch {
    return undefined
  }
}

function ensureLinked() {
  if (linkedProject() === options.project) return
  console.log(`Linking this repository to Vercel project ${options.project}...`)
  // vercel link appends `.env*` to .gitignore (already covered by `.env.*`); keep the tracked file as is.
  const gitignore = `${root}.gitignore`
  const before = existsSync(gitignore) ? readFileSync(gitignore, 'utf8') : undefined
  const result = vercel(['link', '--yes', '--project', options.project])
  if (before !== undefined && readFileSync(gitignore, 'utf8') !== before) {
    writeFileSync(gitignore, before)
  }
  if (result.status !== 0 || linkedProject() !== options.project) {
    console.error(cliMessage(result))
    fail('vercel link failed. If you belong to several teams, pass --scope <team>.')
  }
}

function existingKeys(target) {
  // --json includes readable values: parse it, never print it.
  const result = vercel(['env', 'ls', '--environment', target, '--json'])
  if (result.status !== 0) {
    console.error(cliMessage(result))
    fail(`vercel env ls ${target} failed`)
  }
  const start = result.stdout.indexOf('{')
  let envs
  try {
    envs = JSON.parse(result.stdout.slice(start)).envs
  } catch {
    fail(`could not parse vercel env ls ${target} output`)
  }
  return new Set(
    envs
      .filter((entry) => !entry.gitBranch && [entry.target].flat().includes(target))
      .map((entry) => entry.key),
  )
}

function sensitivityArgs(key, target) {
  if (key.startsWith('NEXT_PUBLIC_')) return ['--no-sensitive']
  if (SENSITIVE.has(key) && target !== 'development') return ['--sensitive']
  return []
}

ensureLinked()

const plans = options.targets.map((target) => {
  const existing = existingKeys(target)
  return {
    target,
    rows: KEYS.map((key) => ({ key, action: existing.has(key) ? 'overwrite' : 'add' })),
  }
})

const width = Math.max(...KEYS.map((key) => key.length))
let failures = 0
for (const { target, rows } of plans) {
  console.log(`\n${target}`)
  for (const { key, action } of rows) {
    const flags = sensitivityArgs(key, target).join(' ')
    if (!options.apply) {
      console.log(`  ${key.padEnd(width)}  ${action.padEnd(9)}  ${flags}`.trimEnd())
      continue
    }
    const args = [
      'env',
      'add',
      key,
      '--environment',
      target,
      '--yes',
      ...sensitivityArgs(key, target),
    ]
    if (action === 'overwrite') args.push('--force')
    const result = vercel(args, env.get(key))
    if (result.status === 0) {
      console.log(`  ${key.padEnd(width)}  OK (${action})`)
    } else {
      failures++
      console.log(`  ${key.padEnd(width)}  FAILED (${action})`)
      console.log(
        cliMessage(result)
          .split('\n')
          .map((line) => `      ${line}`)
          .join('\n'),
      )
    }
  }
}

if (!options.apply) {
  console.log(
    '\nDry run: nothing changed. Apply with: pnpm env:vercel --apply' +
      (process.argv.length > 2 ? ' (plus the same flags)' : ''),
  )
} else {
  if (failures > 0) console.error(`\n${failures} write(s) failed.`)
  console.log('\nRedeploy with Actions → Deploy production for the new values to take effect.')
  if (failures > 0) process.exit(1)
}
