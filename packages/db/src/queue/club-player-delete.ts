import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { closeStaleMatchRequests } from './match-request-store'
import { LIVE_ENTRY } from './session-store'

type Tx = Prisma.TransactionClient

/**
 * Q-SAVED-PLAYERS › Delete player (owner decision, 2026-11-08). Soft delete: the club stops seeing
 * the player; finished sessions, results and the ROTRA profile keep them. Prepared and upcoming
 * sessions release their slot and drop any waitlist spot. In the Active Session they are marked not
 * present, so waiting matches with them need attention; on court or playing blocks the delete.
 */
export type DeleteImpactDto = {
  /** The running session they are in, if any: the only case that asks for confirmation */
  activeSession: { title: string; waitingMatches: number } | null
  /** On court or playing right now: deleting is refused until that match is done */
  busy: boolean
}

async function liveEntry(tx: Tx, context: ClubContext, clubPlayerId: string) {
  return tx.sessionPlayer.findFirst({
    where: {
      clubId: context.clubId,
      clubPlayerId,
      ...LIVE_ENTRY,
      session: { state: 'active' },
    },
    select: { id: true, sessionId: true, session: { select: { title: true } } },
  })
}

async function matchesWith(
  tx: Tx,
  sessionPlayerId: string,
  states: ('waiting' | 'on_court' | 'active')[],
) {
  return tx.match.count({
    where: {
      state: { in: states },
      participations: { some: { sessionPlayerId, leftAt: null } },
    },
  })
}

async function requireSaved(tx: Tx, context: ClubContext, clubPlayerId: string) {
  const row = await tx.clubPlayer.findUnique({
    where: { clubId_id: { clubId: context.clubId, id: clubPlayerId } },
    select: { id: true, displayName: true, removedAt: true },
  })
  if (!row || row.removedAt) throw new ServiceError('not_found')
  return row
}

export async function readDeleteImpact(
  context: ClubContext,
  clubPlayerId: string,
): Promise<DeleteImpactDto> {
  await requireClubEntitlement(context)
  return prisma.$transaction(async (tx) => {
    await requireSaved(tx, context, clubPlayerId)
    const entry = await liveEntry(tx, context, clubPlayerId)
    if (!entry) return { activeSession: null, busy: false }
    return {
      activeSession: {
        title: entry.session.title,
        waitingMatches: await matchesWith(tx, entry.id, ['waiting']),
      },
      busy: (await matchesWith(tx, entry.id, ['on_court', 'active'])) > 0,
    }
  })
}

export async function deleteClubPlayer(context: ClubContext, clubPlayerId: string) {
  await requireClubEntitlement(context)
  return prisma.$transaction(async (tx) => {
    const row = await requireSaved(tx, context, clubPlayerId)
    const now = new Date()
    const entry = await liveEntry(tx, context, clubPlayerId)
    if (entry) {
      if ((await matchesWith(tx, entry.id, ['on_court', 'active'])) > 0)
        throw new ServiceError('conflict', {
          player: `${row.displayName} is on court. Finish or substitute that match first.`,
        })
      await tx.sessionPlayer.update({
        where: { id: entry.id },
        data: { present: false, presentChangedAt: now, revision: { increment: 1 } },
      })
      await closeStaleMatchRequests(tx, entry.sessionId, now)
    }
    await tx.sessionPlayer.updateMany({
      where: {
        clubId: context.clubId,
        clubPlayerId,
        ...LIVE_ENTRY,
        session: { state: 'prepared' },
      },
      data: { releasedAt: now, releaseReason: 'removed', revision: { increment: 1 } },
    })
    await tx.sessionWaitlistEntry.deleteMany({
      where: {
        clubId: context.clubId,
        clubPlayerId,
        session: { state: { in: ['prepared', 'active'] } },
      },
    })
    await tx.clubPlayer.update({
      where: { clubId_id: { clubId: context.clubId, id: row.id } },
      data: { removedAt: now, revision: { increment: 1 } },
    })
    return { clubPlayerId: row.id, name: row.displayName }
  })
}
