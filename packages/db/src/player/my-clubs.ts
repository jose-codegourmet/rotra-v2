import 'server-only'
import { randomUUID } from 'node:crypto'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { ServiceError } from '../service/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * P-OWN-PROFILE · Your clubs: the signed-in player's current `club_players` rows (not removed).
 * `club_players.joined_via` is designed but not migrated (D-2026-11-09-06), so the label is read
 * from what is stored: a confirmed join request the player sent for that saved player is a session
 * link; anything else reads as added by the club. A club link join cannot be told apart yet.
 */
export async function readMyClubs(context: PlayerContext) {
  const rows = await prisma.clubPlayer.findMany({
    where: { playerId: context.playerId, removedAt: null },
    orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      club: { select: { id: true, name: true, logoRef: true } },
      joinRequests: {
        where: { playerId: context.playerId, status: 'confirmed' },
        select: { id: true },
        take: 1,
      },
    },
  })
  return rows.map((row) => ({
    id: row.club.id,
    name: row.club.name,
    initials: initials(row.club.name),
    logoUrl: row.club.logoRef,
    joinedVia: row.joinRequests.length ? ('session_link' as const) : ('club_added' as const),
  }))
}

/**
 * Join club from a club link: saves the player to the club, or brings back the row they left
 * (history keeps one row per club and player). An unknown club is refused. Repeat-safe.
 */
export async function joinMyClub(context: PlayerContext, clubId: string) {
  await addPlayerToClub(context.playerId, clubId)
  return { playerId: context.playerId, clubId }
}

/**
 * Saves a player to a club's saved players (D-2026-11-09-06): Join club, and registration from a
 * club or session link (#707). Repeat-safe; an unknown club is refused.
 */
export async function addPlayerToClub(playerId: string, clubId: string) {
  const unavailable = () =>
    new ServiceError('not_found', { club: 'This club link is not available.' })
  if (!UUID.test(clubId)) throw unavailable()
  try {
    await joinInTransaction(playerId, clubId, unavailable)
  } catch (error) {
    // A second tap that raced the first created the same (club, player) row: already joined.
    if ((error as { code?: string })?.code !== 'P2002') throw error
  }
}

function joinInTransaction(playerId: string, clubId: string, unavailable: () => ServiceError) {
  return prisma.$transaction(async (tx) => {
    const club = await tx.club.findUnique({ where: { id: clubId }, select: { id: true } })
    if (!club) throw unavailable()
    const existing = await tx.clubPlayer.findUnique({
      where: { clubId_playerId: { clubId, playerId } },
      select: { id: true, removedAt: true },
    })
    if (existing) {
      if (existing.removedAt)
        await tx.clubPlayer.update({
          where: { id: existing.id },
          data: { removedAt: null, revision: { increment: 1 } },
        })
      return
    }
    const player = await tx.player.findUnique({
      where: { id: playerId },
      select: { fullName: true, nickname: true },
    })
    if (!player) throw new ServiceError('forbidden')
    await tx.clubPlayer.create({
      data: {
        id: randomUUID(),
        clubId,
        playerId,
        displayName: player.fullName,
        nickname: player.nickname,
        addedAt: new Date(),
      },
    })
  })
}

/**
 * Leave club (owner decision): marks the player's row removed and keeps it for history; never a
 * hard delete. Only the signed-in player's own row is touched. Leaving again is a no-op.
 */
export async function leaveMyClub(context: PlayerContext, clubId: string) {
  if (UUID.test(clubId))
    await prisma.clubPlayer.updateMany({
      where: { clubId, playerId: context.playerId, removedAt: null },
      data: { removedAt: new Date(), revision: { increment: 1 } },
    })
  return { playerId: context.playerId, clubId }
}
