import 'server-only'
import { prisma } from '../client/prisma'

/**
 * Player Information's read of one platform flag, usable signed out (`/login`, invite links). Always
 * a fresh read, never cached. A missing flag or any failed read is off. Ported to Go with B-04.
 */
export async function readPlayerFeatureFlag(key: string): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { key }, select: { value: true } })
    return flag?.value === true
  } catch {
    return false
  }
}
