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
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { rotraPrisma?: PrismaClient }

export const prisma = globalForPrisma.rotraPrisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.rotraPrisma = prisma
