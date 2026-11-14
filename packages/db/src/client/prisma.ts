import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../generated/prisma/client'

/**
 * The one server-only runtime client. Uses the pooled runtime connection, never the migration
 * connection. `server-only` makes any client-bundle import fail the build.
 */
/**
 * On Vercel every function instance has its own pool, and a traffic burst starts hundreds of
 * instances at once. Five connections each ran the Supabase pooler past its client limit
 * (EMAXCONN, November 12, 2026), so serverless defaults to one connection, closed after a short
 * idle. DATABASE_POOL_MAX / DATABASE_IDLE_TIMEOUT_MS still win when set.
 */
const serverless = process.env.VERCEL === '1'

/**
 * One connection per instance was not enough (EMAXCONN again, November 14, 2026): Vercel suspends
 * an instance as soon as its response is sent, so the pool's idle timer never fires and the socket
 * stays open on the Supabase pooler until the instance is killed minutes later. Hundreds of
 * suspended instances then hold the pooler's 200 client slots. After every query we ask Vercel to
 * keep the instance awake until the idle timer has closed the connection (the same thing
 * `attachDatabasePool` from `@vercel/functions` does, without the dependency).
 */
type RequestContext = {
  get?: () => { waitUntil?: (promise: Promise<unknown>) => void } | undefined
}

function keepAwakeUntilIdleClosed(pool: Pool, idleTimeoutMillis: number) {
  pool.on('release', () => {
    const context = (globalThis as Record<symbol, RequestContext | undefined>)[
      Symbol.for('@vercel/request-context')
    ]
    const waitUntil = context?.get?.()?.waitUntil
    if (!waitUntil) return
    waitUntil(new Promise((resolve) => setTimeout(resolve, idleTimeoutMillis + 200)))
  })
}

function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const idleTimeoutMillis = Number(
    process.env.DATABASE_IDLE_TIMEOUT_MS ?? (serverless ? 5_000 : 10_000),
  )
  const pool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? (serverless ? 1 : 5)),
    idleTimeoutMillis,
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
  })
  // A dropped pooler socket must not crash the instance; the next query opens a fresh one.
  pool.on('error', (error) => console.error('[db] idle connection error', error.name))
  if (serverless) keepAwakeUntilIdleClosed(pool, idleTimeoutMillis)
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    // A command is several round trips under one lock; from a dev machine to the hosted region each
    // trip is slow enough that Prisma's 5 s default expires mid-commit. Statements keep their own limit.
    transactionOptions: {
      maxWait: Number(process.env.DATABASE_TX_MAX_WAIT_MS ?? 10_000),
      timeout: Number(process.env.DATABASE_TX_TIMEOUT_MS ?? 30_000),
    },
  })
}

const globalForPrisma = globalThis as unknown as { rotraPrisma?: PrismaClient }
let instance: PrismaClient | undefined

/** Created on first use, so `next build` can import Route Handlers without a database URL. */
function client(): PrismaClient {
  // Kept on globalThis in production too: a function bundle can load this module more than once,
  // and every copy would otherwise open its own pool.
  instance ??= globalForPrisma.rotraPrisma ?? createClient()
  globalForPrisma.rotraPrisma = instance
  return instance
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const target = client()
    const value = Reflect.get(target, property, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
})
