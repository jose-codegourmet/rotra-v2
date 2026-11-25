import { execFileSync, spawnSync } from 'node:child_process'
import { assertLocalDbUrl, E2E_DB_NAME, E2E_DB_PORT } from './guard.ts'
import { E2E_DB_URL, E2E_PG_CONTAINER, E2E_PG_IMAGE } from './stack.ts'

/**
 * The throwaway Postgres is a Docker container named `rotra-e2e-pg` on 127.0.0.1:54329. `make e2e`
 * starts or reuses it; CI uses the same path. SQL runs through `docker exec ... psql`, so the Mac
 * needs Docker and nothing else (no `psql`, no Supabase CLI).
 */

const docker = (args: string[], input?: string) =>
  execFileSync('docker', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] })

function containerState(): 'running' | 'stopped' | 'missing' {
  const result = spawnSync(
    'docker',
    ['inspect', '--format', '{{.State.Running}}', E2E_PG_CONTAINER],
    { encoding: 'utf8' },
  )
  if (result.status !== 0) return 'missing'
  return result.stdout.trim() === 'true' ? 'running' : 'stopped'
}

/** Starts the container if it is not running, and waits until Postgres answers. */
export async function ensureDatabaseServer() {
  const state = containerState()
  if (state === 'missing')
    docker([
      'run',
      '-d',
      '--name',
      E2E_PG_CONTAINER,
      '-e',
      'POSTGRES_PASSWORD=postgres',
      '-p',
      `127.0.0.1:${E2E_DB_PORT}:5432`,
      E2E_PG_IMAGE,
    ])
  else if (state === 'stopped') docker(['start', E2E_PG_CONTAINER])
  for (let attempt = 0; attempt < 120; attempt++) {
    const ready = spawnSync(
      'docker',
      // Over TCP: while the image initialises, its temporary server listens on the socket only.
      [
        'exec',
        E2E_PG_CONTAINER,
        'psql',
        '-h',
        '127.0.0.1',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-tAc',
        'SELECT 1',
      ],
      { encoding: 'utf8' },
    )
    if (ready.status === 0 && ready.stdout.trim() === '1') return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`[e2e] ${E2E_PG_CONTAINER} did not accept connections in 60 s.`)
}

type Target = 'server' | 'app'

/**
 * Runs SQL (psql variables via `vars`) and returns the first column of the first row. `server` is the
 * `postgres` maintenance database (create/drop); `app` is `rotra_disposable_e2e`.
 */
export function sql(statement: string, target: Target = 'app', vars: Record<string, string> = {}) {
  assertLocalDbUrl('DATABASE_URL', E2E_DB_URL)
  const database = target === 'app' ? E2E_DB_NAME : 'postgres'
  const args = ['exec', '-i', E2E_PG_CONTAINER, 'psql', '-U', 'postgres', '-d', database]
  args.push('-v', 'ON_ERROR_STOP=1', '-qtA')
  for (const [key, value] of Object.entries(vars)) args.push('-v', `${key}=${value}`)
  return docker(args, statement).trim()
}
