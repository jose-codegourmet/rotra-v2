import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { QueueSession } from '../generated/prisma/client'
import { notifyWaitlistPlace } from '../player/notification-events'
import { ServiceError } from '../service/errors'
import { placeClubMember } from './session-roster'
import { capacityOf, derivedId, LIVE_ENTRY, orderedWaitlist, type Tx } from './session-store'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** One current host of a session, as Q-SETUP reads them (#1004). The screen joins the saved player. */
export type SessionHostDto = { id: string; clubPlayerId: string; assignedAt: string }

/** What a setup save did with its hosts: given a slot, or put on the waitlist (every slot taken). */
export type HostRegistration = { registered: number; waitlisted: number }

/** Q-SETUP › Hosts (#1004, D-2026-11-22-01): the session's current hosts, oldest first. */
export async function listSessionHosts(
  context: ClubContext,
  sessionId: string,
): Promise<SessionHostDto[]> {
  if (!UUID.test(sessionId)) throw new ServiceError('not_found')
  const session = await prisma.queueSession.findFirst({
    where: { id: sessionId, clubId: context.clubId },
    select: { id: true },
  })
  if (!session) throw new ServiceError('not_found')
  const rows = await prisma.sessionHost.findMany({
    where: { clubId: context.clubId, sessionId, removedAt: null },
    orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
    select: { id: true, clubPlayerId: true, assignedAt: true },
  })
  return rows.map((row) => ({
    id: row.id,
    clubPlayerId: row.clubPlayerId,
    assignedAt: row.assignedAt.toISOString(),
  }))
}

/** Reads `hostClubPlayerIds` from a setup payload: undefined = unchanged; anything else must be ids. */
export function hostIdsInput(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !UUID.test(id)))
    throw new ServiceError('invalid', { hosts: 'Pick hosts from your saved players.' })
  return [...new Set(value as string[])]
}

/**
 * The write behind Q-SETUP › Hosts (#1004, D-2026-11-22-01), inside the create or edit transaction
 * of a prepared session (the caller holds the session lock and bumps the revision). `hostIds` is
 * the full list of current hosts after the save, in the order picked:
 * - a host no longer listed ends their `session_hosts` row; their roster or waitlist place stays;
 * - a newly listed host must be a current trusted host of the club (the setup adds a picked saved
 *   player to the list first, after its confirmation). They get a host row and, unless they already
 *   hold a live slot or a waitlist place, a place by the preparation rule: a slot while one is open,
 *   otherwise the end of the waitlist. Their latest club level comes with them (through the confirm
 *   path's placement); a saved player without one is placed without a level, set later in Roster
 *   and levels. Repeat-safe on `operationId`.
 */
export async function assignSessionHostsIn(
  tx: Tx,
  context: ClubContext,
  session: QueueSession,
  hostIds: string[],
  operationId: string,
  now: Date,
): Promise<HostRegistration> {
  const result: HostRegistration = { registered: 0, waitlisted: 0 }
  const current = await tx.sessionHost.findMany({
    where: { clubId: context.clubId, sessionId: session.id, removedAt: null },
  })
  const ending = current.filter((row) => !hostIds.includes(row.clubPlayerId))
  if (ending.length)
    await tx.sessionHost.updateMany({
      where: { id: { in: ending.map((row) => row.id) } },
      data: { removedAt: now, revision: { increment: 1 } },
    })
  const fresh = hostIds.filter((id) => !current.some((row) => row.clubPlayerId === id))
  if (!fresh.length) return result
  const players = await tx.clubPlayer.findMany({
    where: { clubId: context.clubId, id: { in: fresh }, removedAt: null },
  })
  const trusted = new Set(
    (
      await tx.clubTrustedHost.findMany({
        where: { clubId: context.clubId, clubPlayerId: { in: fresh }, removedAt: null },
        select: { clubPlayerId: true },
      })
    ).map((row) => row.clubPlayerId),
  )
  for (const [index, id] of fresh.entries()) {
    const clubPlayer = players.find((p) => p.id === id)
    if (!clubPlayer)
      throw new ServiceError('invalid', { hosts: 'A host is no longer one of your saved players.' })
    if (!trusted.has(id))
      throw new ServiceError('conflict', {
        hosts: `${clubPlayer.displayName} is not a trusted host. Pick them again to add them to your trusted hosts.`,
      })
    const at = new Date(now.getTime() + index)
    await tx.sessionHost.create({
      data: {
        id: await derivedId(operationId, `host:${id}`),
        clubId: context.clubId,
        sessionId: session.id,
        clubPlayerId: id,
        assignedAt: at,
      },
    })
    const waiting = await tx.sessionWaitlistEntry.findUnique({
      where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: id } },
    })
    const entry = await tx.sessionPlayer.findUnique({
      where: { sessionId_clubPlayerId: { sessionId: session.id, clubPlayerId: id } },
    })
    // Already registered (a live slot or a waitlist place): never a second registration.
    if (waiting || (entry && !entry.releasedAt && !entry.noShowAt)) continue
    const level = await tx.clubAssessment.findFirst({
      where: { clubId: context.clubId, clubPlayerId: id },
      orderBy: [{ assessedAt: 'desc' }, { id: 'desc' }],
      select: { skillLevelId: true },
    })
    const placeId = await derivedId(operationId, `host-place:${id}`)
    if (level) {
      const placed = await placeClubMember(
        tx,
        context,
        session,
        clubPlayer,
        level.skillLevelId,
        placeId,
        at,
        false,
      )
      if (placed.waitlist) result.waitlisted++
      else result.registered++
      continue
    }
    // No saved level: the same placement, with the level left for Roster and levels.
    const rosterCount = await tx.sessionPlayer.count({
      where: { sessionId: session.id, ...LIVE_ENTRY },
    })
    if (rosterCount < (await capacityOf(tx, session))) {
      if (entry)
        await tx.sessionPlayer.update({
          where: { id: entry.id },
          data: {
            releasedAt: null,
            releaseReason: null,
            noShowAt: null,
            confirmedAt: at,
            present: false,
            presentChangedAt: at,
            overBudgetAt: null,
            revision: { increment: 1 },
          },
        })
      else
        await tx.sessionPlayer.create({
          data: {
            id: await derivedId(placeId, 'entry'),
            clubId: context.clubId,
            sessionId: session.id,
            clubPlayerId: id,
            playerIdAtEntry: clubPlayer.playerId,
            nameSnapshot: clubPlayer.displayName,
            present: false,
            presentChangedAt: at,
            confirmedAt: at,
            joinedAt: at,
          },
        })
      result.registered++
    } else {
      const waiter = await tx.sessionWaitlistEntry.create({
        data: {
          id: await derivedId(placeId, 'waitlist'),
          clubId: context.clubId,
          sessionId: session.id,
          clubPlayerId: id,
          skillLevelId: null,
          addedAt: at,
        },
      })
      const position = (await orderedWaitlist(tx, session.id)).findIndex((w) => w.id === waiter.id)
      await notifyWaitlistPlace(tx, session, clubPlayer.playerId, waiter.id, position + 1)
      result.waitlisted++
    }
  }
  return result
}
