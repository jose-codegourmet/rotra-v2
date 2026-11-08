import 'server-only'
import { levelBandOf } from '@rotra/data/admin-player/management-rules'
import { createdOnFromRtrId } from '@rotra/data/admin-player/rules'
import type { AdminPlayer } from '@rotra/data/admin-player/types'
import type { PlayerSessionRecord } from '@rotra/data/player/types'
import type { AdminContext } from '../auth/account-context'
import { prisma } from '../client/prisma'
import { readPlayerMatchHistory } from '../player/projections'
import { requireAdmin, requireRevision } from '../service/authorize'
import { ServiceError } from '../service/errors'
import { recordAudit } from './audit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A-PLAYERS: explicitly allowlisted owner-only projection of allocated player identities. */
export async function readAdminPlayerDirectory(
  context: AdminContext,
  playerId?: string,
): Promise<(Omit<AdminPlayer, 'revision'> & { revision: string })[]> {
  requireAdmin(context)
  const players = await prisma.player.findMany({
    where: { idAllocation: { isNot: null }, ...(playerId ? { id: playerId } : {}) },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      avatarRef: true,
      profileState: true,
      hidePhoneFromClubs: true,
      revision: true,
      privateContact: { select: { phoneE164: true, email: true } },
      account: { select: { claimedAt: true } },
      idAllocation: {
        select: {
          rtrId: true,
          creatingClubId: true,
          cityCode: true,
          location: { select: { displayName: true } },
        },
      },
      clubPlayers: {
        orderBy: [{ addedAt: 'asc' }, { id: 'asc' }],
        select: { clubId: true, nickname: true, addedAt: true, club: { select: { name: true } } },
      },
      rankCurrent: {
        select: {
          recentStandardMatchCount: true,
          leaderboardEligible: true,
          skillLevel: { select: { displayOrder: true, label: true } },
          policyVersion: { select: { recentStandardMatchThreshold: true } },
        },
      },
    },
  })
  return players.flatMap((player) => {
    const allocation = player.idAllocation
    if (!allocation) return []
    const rank = player.rankCurrent
    const level = rank?.skillLevel
    const levelIndex = level?.displayOrder ?? null
    const recentStandardMatches = rank?.recentStandardMatchCount ?? 0
    const claimed = player.profileState === 'claimed'
    const createdOn = createdOnFromRtrId(allocation.rtrId)
    return [
      {
        id: player.id,
        name: player.fullName,
        nickname: player.nickname ?? player.clubPlayers.find((p) => p.nickname)?.nickname ?? null,
        rtrId: allocation.rtrId,
        createdByClubId: allocation.creatingClubId,
        createdOn,
        addedOn: createdOn,
        picture: player.avatarRef,
        registeredPlace: { code: allocation.cityCode, name: allocation.location.displayName },
        phone: player.privateContact?.phoneE164,
        email: player.privateContact?.email ?? undefined,
        phoneHidden: player.hidePhoneFromClubs,
        claimed,
        registeredOn: player.account?.claimedAt.toISOString().slice(0, 10),
        clubs: player.clubPlayers.map((p) => ({
          clubId: p.clubId,
          name: p.club.name,
          addedAt: p.addedAt.getTime(),
          identity: claimed ? ('registered' as const) : ('unclaimed' as const),
        })),
        levelIndex,
        levelBand: levelBandOf(levelIndex),
        recentStandardMatches,
        // Read the stored projection; a match count alone cannot establish leaderboard eligibility.
        rankStatus:
          !level || !rank
            ? { kind: 'none' as const, text: 'No rank yet' }
            : rank.leaderboardEligible
              ? { kind: 'board' as const, text: `${level.label} · on the overall leaderboard` }
              : {
                  kind: 'below' as const,
                  text: `${level.label} · ${recentStandardMatches} of ${rank.policyVersion.recentStandardMatchThreshold} recent matches`,
                },
        // Archive/removal persistence is not implemented; never infer permission to remove a row.
        archivedAt: null,
        revision: player.revision.toString(),
        removalReason: "This part of ROTRA isn't connected to saved data yet.",
      },
    ]
  })
}

/** Reuses the canonical read-only history projection, behind the Admin account boundary. */
export async function readAdminPlayerGames(
  context: AdminContext,
  playerId: string,
): Promise<PlayerSessionRecord[]> {
  requireAdmin(context)
  if (!UUID.test(playerId)) throw new ServiceError('not_found')
  const player = await prisma.playerIdAllocation.findUnique({
    where: { playerId },
    select: { playerId: true },
  })
  if (!player) throw new ServiceError('not_found')
  const sessions = await readPlayerMatchHistory(playerId)
  return sessions.flatMap((s) =>
    s.finishedAt
      ? [
          {
            ...s,
            finishedAt: s.finishedAt,
            games: s.games.map((g) => ({
              ...g,
              counting: g.counting as 'counted' | 'fun' | 'partial',
              result: g.result as 'won' | 'lost',
            })),
          },
        ]
      : [],
  )
}

/**
 * A-PLAYER Edit profile: full name and nickname under the loaded revision, with a reason. The global
 * identity only: `club_players.display_name` is the club's own copy (clubs edit it) and the rank
 * projection stores no name, so neither is rewritten. `avatar_ref` holds an uploaded photo
 * reference, never a URL, so a changed photo link is refused rather than saved.
 */
export async function updateAdminPlayerProfile(
  context: AdminContext,
  input: {
    playerId: string
    expectedRevision: string
    name: string
    nickname: string
    picture: string
    reason: string
  },
) {
  requireAdmin(context)
  if (!UUID.test(input.playerId)) throw new ServiceError('not_found')
  const name = input.name.trim()
  const nickname = input.nickname.trim() || null
  const reason = input.reason.trim()
  if (!name) throw new ServiceError('invalid', { name: 'Enter a name.' })
  if (!reason) throw new ServiceError('invalid', { reason: 'Enter a reason.' })
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "players" WHERE "id" = ${input.playerId}::uuid FOR UPDATE`
    if (!rows.length) throw new ServiceError('not_found')
    const player = await tx.player.findUniqueOrThrow({
      where: { id: input.playerId },
      select: {
        id: true,
        fullName: true,
        nickname: true,
        avatarRef: true,
        profileState: true,
        revision: true,
        idAllocation: { select: { playerId: true } },
      },
    })
    if (!player.idAllocation) throw new ServiceError('not_found')
    requireRevision(player.revision, input.expectedRevision)
    // An empty picture keeps the current photo; only a different link is refused.
    const picture = input.picture.trim()
    if (picture && picture !== (player.avatarRef ?? ''))
      throw new ServiceError('invalid', {
        picture:
          player.profileState === 'claimed'
            ? 'Photos for registered players cannot be edited by Admin.'
            : "Photo links can't be saved yet.",
      })
    await tx.player.update({
      where: { id: player.id },
      data: { fullName: name, nickname, revision: { increment: 1 } },
    })
    await recordAudit(tx, context, {
      action: 'player.profile_updated',
      targetType: 'player',
      targetId: player.id,
      metadata: {
        before: { name: player.fullName, nickname: player.nickname },
        after: { name, nickname },
        reason,
      },
    })
  })
  const [player] = await readAdminPlayerDirectory(context, input.playerId)
  if (!player) throw new ServiceError('not_found')
  return player
}
