import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

/**
 * The one server-only runtime client. Uses the pooled runtime connection, never the migration
 * connection. `server-only` makes any client-bundle import fail the build.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
  })
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
  instance ??= globalForPrisma.rotraPrisma ?? createClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.rotraPrisma = instance
  return instance
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const target = client()
    const value = Reflect.get(target, property, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
})
