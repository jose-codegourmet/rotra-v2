import 'server-only'
import type { ClubContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { requireClubEntitlement } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { mapDatabaseError } from './session-store'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * One current trusted host as Club settings › Trusted hosts lists them (D-2026-11-22-01). The
 * screen joins it to the saved player (name, picture, identity) it already reads; nothing private
 * leaves here.
 */
export type TrustedHostDto = {
  id: string
  clubPlayerId: string
  addedAt: string
}

const NOT_AVAILABLE = { player: 'Player not available.' }

/**
 * The club's current trusted hosts, oldest first. A saved player the club deleted, or moved into
 * another saved player (Same person), is left out: the trusted-host row stays as history.
 */
export async function listTrustedHosts(context: ClubContext): Promise<TrustedHostDto[]> {
  const rows = await prisma.clubTrustedHost.findMany({
    where: { clubId: context.clubId, removedAt: null, clubPlayer: { removedAt: null } },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: { id: true, clubPlayerId: true, addedAt: true },
  })
  return rows.map((row) => ({
    id: row.id,
    clubPlayerId: row.clubPlayerId,
    addedAt: row.addedAt.toISOString(),
  }))
}

/**
 * P-PROFILE · Clubs › Host badge (#1007, D-2026-11-22-01): the ids of the clubs where this ROTRA
 * player is a current trusted host, read straight from the profile's own clubs read (no extra
 * request). A club counts when it has a current trusted-host row (`removed_at` null) on a current
 * saved player linked to the player (`player_id`), or on a record the Queue Master moved into
 * that linked record (`linked_to_club_player_id`, the Same person step), so the surviving record
 * decides. Removing trust ends the badge; the saved player stays. Nothing here grants a permission.
 */
export async function readHostClubIds(playerId: string): Promise<Set<string>> {
  const rows = await prisma.clubTrustedHost.findMany({
    where: {
      removedAt: null,
      OR: [
        { clubPlayer: { playerId, removedAt: null } },
        { clubPlayer: { removedAt: { not: null }, linkedTo: { playerId, removedAt: null } } },
      ],
    },
    select: { clubId: true },
  })
  return new Set(rows.map((row) => row.clubId))
}

async function savedPlayerName(tx: Prisma.TransactionClient, clubId: string, clubPlayerId: string) {
  const row = await tx.clubPlayer.findFirst({
    where: { id: clubPlayerId, clubId, removedAt: null },
    select: { id: true, displayName: true, player: { select: { fullName: true } } },
  })
  if (!row) throw new ServiceError('not_found', NOT_AVAILABLE)
  return row.player?.fullName || row.displayName
}

/**
 * Club settings › Trusted hosts › Add (D-2026-11-22-01): puts one of the club's saved players on its
 * trusted-host list. Guests and unclaimed players qualify. Already trusted reads as a conflict.
 * Only the list changes: no role, permission, sign-in or saved-player field is touched.
 */
export async function addTrustedHost(context: ClubContext, input: { clubPlayerId: string }) {
  await requireClubEntitlement(context)
  if (!UUID.test(input.clubPlayerId)) throw new ServiceError('not_found', NOT_AVAILABLE)
  try {
    return await prisma.$transaction(async (tx) => {
      const name = await savedPlayerName(tx, context.clubId, input.clubPlayerId)
      const current = await tx.clubTrustedHost.findFirst({
        where: { clubId: context.clubId, clubPlayerId: input.clubPlayerId, removedAt: null },
        select: { id: true },
      })
      if (current)
        throw new ServiceError('conflict', { player: `${name} is already a trusted host.` })
      const row = await tx.clubTrustedHost.create({
        data: {
          id: crypto.randomUUID(),
          clubId: context.clubId,
          clubPlayerId: input.clubPlayerId,
          addedAt: new Date(),
        },
        select: { id: true, clubPlayerId: true, addedAt: true },
      })
      return {
        trustedHost: {
          id: row.id,
          clubPlayerId: row.clubPlayerId,
          addedAt: row.addedAt.toISOString(),
        } satisfies TrustedHostDto,
        message: `${name} added to trusted hosts`,
      }
    })
  } catch (error) {
    if (error instanceof ServiceError) throw error
    mapDatabaseError(error)
  }
}

/**
 * Club settings › Trusted hosts › Remove host (D-2026-11-22-01): ends the current trusted-host row
 * (`removed_at`). The saved player, their registrations and every session's host records stay.
 */
export async function removeTrustedHost(context: ClubContext, input: { clubPlayerId: string }) {
  await requireClubEntitlement(context)
  if (!UUID.test(input.clubPlayerId)) throw new ServiceError('not_found', NOT_AVAILABLE)
  return prisma.$transaction(async (tx) => {
    const name = await savedPlayerName(tx, context.clubId, input.clubPlayerId)
    const ended = await tx.clubTrustedHost.updateMany({
      where: { clubId: context.clubId, clubPlayerId: input.clubPlayerId, removedAt: null },
      data: { removedAt: new Date(), revision: { increment: 1 } },
    })
    if (ended.count === 0)
      throw new ServiceError('not_found', { player: `${name} is not a trusted host.` })
    return { clubPlayerId: input.clubPlayerId, message: `${name} removed from trusted hosts` }
  })
}
