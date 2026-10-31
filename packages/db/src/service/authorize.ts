import 'server-only'
import type { AccountContext, AdminContext, ClubContext, PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { denyScope, ServiceError } from './errors'

/** The signed-in club may act only on its own club ID. */
export function requireOwnClub(context: AccountContext, clubId: string): ClubContext {
  if (context.kind !== 'club') throw new ServiceError('wrong_account')
  if (context.clubId !== clubId) denyScope()
  return context
}

/** The signed-in player may act only on their own player ID. */
export function requireOwnPlayer(context: AccountContext, playerId: string): PlayerContext {
  if (context.kind !== 'player') throw new ServiceError('wrong_account')
  if (context.playerId !== playerId) denyScope()
  return context
}

export function requireAdmin(context: AccountContext): AdminContext {
  if (context.kind !== 'admin') throw new ServiceError('wrong_account')
  return context
}

/**
 * Club entitlement from the server-owned `club_entitlements` projection, checked against server time.
 * The active-session completion exception is decided by the session services, not here.
 */
export async function requireClubEntitlement(context: ClubContext, now = new Date()) {
  const entitlement = await prisma.clubEntitlement.findUnique({
    where: { clubId: context.clubId },
    select: { effectiveAccessEndsAt: true, effectiveTermId: true },
  })
  if (!entitlement?.effectiveAccessEndsAt || entitlement.effectiveAccessEndsAt <= now)
    throw new ServiceError('entitlement_required')
  return entitlement
}

/** Optimistic concurrency: a command's expected base revision must match the stored one. */
export function requireRevision(stored: bigint, expected: string | bigint) {
  let expectedRevision: bigint
  try {
    expectedRevision = typeof expected === 'bigint' ? expected : BigInt(expected)
  } catch {
    throw new ServiceError('invalid', { revision: 'Expected a whole-number revision.' })
  }
  if (stored !== expectedRevision) throw new ServiceError('conflict')
}
