import 'server-only'
import { randomUUID } from 'node:crypto'
import { requireClubInvite } from '../admin/club-invite'
import type { PlayerContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { readHostClubIds } from '../queue/club-hosts'
import type { Tx } from '../queue/session-store'
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
  const hostClubs = await readHostClubIds(context.playerId)
  return rows.map((row) => ({
    id: row.club.id,
    name: row.club.name,
    initials: initials(row.club.name),
    logoUrl: row.club.logoRef,
    isHost: hostClubs.has(row.club.id),
    joinedVia: row.joinRequests.length ? ('session_link' as const) : ('club_added' as const),
  }))
}

/**
 * Join club from a club link: saves the player to the club, or brings back the row they left
 * (history keeps one row per club and player). The link's invite code must be the club's current
 * one (#712); a missing, wrong or regenerated code and an unknown club are refused. Repeat-safe.
 */
export async function joinMyClub(
  context: PlayerContext,
  clubId: string,
  inviteCode?: string | null,
) {
  await requireClubInvite(clubId, inviteCode)
  await addPlayerToClub(context.playerId, clubId)
  return { playerId: context.playerId, clubId }
}

/**
 * Saves a player to a club's saved players (D-2026-11-09-06): Join club, and registration from a
 * club or session link (#707). Callers check the link first (the club invite code, #712, or the
 * session link); this never does. Repeat-safe; an unknown club is refused.
 */
export async function addPlayerToClub(playerId: string, clubId: string) {
  const unavailable = () =>
    new ServiceError('not_found', { club: 'This club link is not available.' })
  if (!UUID.test(clubId)) throw unavailable()
  await prisma.$transaction((tx) => activateClubMembership(tx, playerId, clubId, unavailable))
}

/**
 * Club membership is one `club_players` row per (club, player) (#1018, D-2026-11-22-07): this makes
 * the player a member of the club, in the caller's transaction. No row: one is created. A row the
 * player left (or the club deleted) comes back as the SAME row with `removed_at` cleared, so there
 * is never a duplicate. Already a member: nothing changes. No owner approval, and it grants no
 * queue-management right. Callers check the link first; this never does.
 */
export async function activateClubMembership(
  tx: Tx,
  playerId: string,
  clubId: string,
  unavailable: () => ServiceError = () =>
    new ServiceError('not_found', { club: 'This club link is not available.' }),
) {
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
  // A second request that raced this one created the same (club, player) row: already a member.
  await tx.clubPlayer.createMany({
    data: [
      {
        id: randomUUID(),
        clubId,
        playerId,
        displayName: player.fullName,
        nickname: player.nickname,
        addedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  })
}

/**
 * Leave club (owner decision, #1018): never blocked. Marks the player's row removed and keeps it for
 * history; never a hard delete. Registrations, payments and past transfer records stay. In the same
 * transaction every PENDING slot transfer the player is part of (sender, or recipient or claimant of
 * a transfer link) in this club's sessions becomes `cancelled`, which also ends its link, and the
 * player's current trusted-host row in the club ends (`removed_at` set, history kept; session host
 * records untouched), so rejoining never restores it. Only the signed-in player's own row is touched.
 * Leaving again is a no-op.
 */
export async function leaveMyClub(context: PlayerContext, clubId: string) {
  if (!UUID.test(clubId)) return { playerId: context.playerId, clubId }
  await prisma.$transaction(async (tx) => {
    const now = new Date()
    const rows = await tx.clubPlayer.findMany({
      where: { clubId, playerId: context.playerId, removedAt: null },
      select: { id: true },
    })
    if (rows.length === 0) return
    const ids = rows.map((row) => row.id)
    await tx.clubPlayer.updateMany({
      where: { clubId, id: { in: ids }, removedAt: null },
      data: { removedAt: now, revision: { increment: 1 } },
    })
    await tx.sessionSlotTransfer.updateMany({
      where: {
        clubId,
        status: 'pending',
        OR: [{ senderPlayerId: context.playerId }, { recipientPlayerId: context.playerId }],
      },
      data: { status: 'cancelled', decidedAt: now },
    })
    // The current trusted-host row ends (history kept); rejoining never restores it. Records moved
    // into the one left (Same person) count for it, so theirs end too. Session hosts are untouched.
    await tx.clubTrustedHost.updateMany({
      where: {
        clubId,
        removedAt: null,
        OR: [{ clubPlayerId: { in: ids } }, { clubPlayer: { linkedToClubPlayerId: { in: ids } } }],
      },
      data: { removedAt: now, revision: { increment: 1 } },
    })
  })
  return { playerId: context.playerId, clubId }
}
