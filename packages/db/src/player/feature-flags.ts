import 'server-only'
import { prisma } from '../client/prisma'

/**
 * Player Information's read of one platform flag, usable signed out (`/login`, invite links). Always
 * a fresh read, never cached. A missing flag or any failed read is off. Ported to Go with B-04.
 */
export async function readPlayerFeatureFlag(
  key: string,
  /**
   * Inside a transaction, pass its client: on Vercel the pool has one connection, so a read on
   * `prisma` while the transaction holds it waits forever (the Player app hung, November 20, 2026).
   */
  client: Pick<typeof prisma, 'featureFlag'> = prisma,
): Promise<boolean> {
  try {
    const flag = await client.featureFlag.findUnique({ where: { key }, select: { value: true } })
    return flag?.value === true
  } catch {
    return false
  }
}
