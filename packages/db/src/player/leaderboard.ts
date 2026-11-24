import 'server-only'
import {
  type LeaderboardFact,
  leaderboardPeriodStart,
  leaderboardStandings,
  ownPeriodPosition,
} from '@rotra/data/leaderboard/rules'
import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_PERIODS,
  type LeaderboardPage,
  type LeaderboardPeriod,
  type LeaderboardPlace,
  type LeaderboardRow,
} from '@rotra/data/leaderboard/types'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { readShownProfileBanners } from '../admin/profile-banners'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { levelCodeFor } from '../queue/session-store'
import { ServiceError } from '../service/errors'

export function parseLeaderboardPeriod(value: string | null): LeaderboardPeriod {
  if (value === null) return 'year'
  if (value === 'year' || value === 'month' || value === 'week') return value
  throw new ServiceError('invalid')
}

/** Load the two relevant periods once. A profile or Compare loads the annual window for all three. */
export async function readPeriodLeaderboard(
  period: LeaderboardPeriod,
  now = Date.now(),
  db: Prisma.TransactionClient = prisma,
) {
  const start = leaderboardPeriodStart(period, now)
  const previousStart = leaderboardPeriodStart(period, start - 1)
  const records = await db.playerMatchFact.findMany({
    where: {
      playedAt: { gte: new Date(previousStart), lte: new Date(now) },
      format: { in: ['singles', 'doubles'] },
      fullParticipation: true,
      standardMatch: true,
      decision: { kind: 'completed', match: { state: 'completed' } },
      // A session with Record games off is not ranked (D-2026-11-20-02): its wins never count here.
      finalization: {
        committedAt: { not: null },
        session: { state: 'completed', recordGames: true },
      },
    },
    select: {
      playerIdAtFinalization: true,
      playedAt: true,
      team: true,
      winningTeam: true,
      clubPlayer: {
        select: { attributions: { where: { revokedAt: null }, select: { playerId: true } } },
      },
    },
  })
  const facts: LeaderboardFact[] = []
  const ids = new Set<string>()
  for (const record of records) {
    // A reviewed link can refer to the identity already recorded at finalization.
    const owners = new Set(record.clubPlayer.attributions.map((link) => link.playerId))
    if (record.playerIdAtFinalization) owners.add(record.playerIdAtFinalization)
    for (const playerId of owners) {
      ids.add(playerId)
      facts.push({
        playerId,
        playedAt: record.playedAt,
        won: record.team === record.winningTeam,
        fullParticipation: true,
        standardMatch: true,
        valid: true,
      })
    }
  }
  const players = await db.player.findMany({
    where: { id: { in: [...ids] }, idAllocation: { isNot: null } },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      avatarRef: true,
      banner: { select: { id: true, image: true } },
      profileState: true,
      profileVisibility: true,
      rankCurrent: { select: { skillLevelId: true } },
      clubPlayers: {
        where: { removedAt: null, player: { profileState: 'unclaimed' } },
        select: { displayName: true, nickname: true },
      },
    },
  })
  const candidates = players.map((player) => {
    const club = player.clubPlayers.length === 1 ? player.clubPlayers[0] : undefined
    return {
      ...player,
      fullName: club?.displayName ?? player.fullName,
      nickname: club ? club.nickname : player.nickname,
      unclaimedClubCount:
        player.profileState === 'unclaimed' ? player.clubPlayers.length : undefined,
    }
  })
  const identity = new Map(candidates.map((player) => [player.id, player]))
  const standings = leaderboardStandings(period, now, candidates, facts)
  const top = standings.slice(0, LEADERBOARD_LIMIT)
  const entries = async (rows: typeof top, viewerId: string | null): Promise<LeaderboardRow[]> => {
    if (!rows.length) return []
    const banners = await readShownProfileBanners(db)
    return rows.flatMap((row) => {
      const player = identity.get(row.id)
      if (!player) return []
      const unclaimed = player.unclaimedClubCount === 1
      const levelHidden =
        !unclaimed && player.profileVisibility === 'always_private' && viewerId !== row.id
      const masked =
        levelHidden || (!unclaimed && !viewerId && player.profileVisibility === 'private')
      return [
        {
          ...row,
          fullName: masked ? maskPublicName(player.fullName) : player.fullName,
          nickname: masked ? null : player.nickname,
          playingLevel: levelHidden ? null : levelCodeFor(player.rankCurrent?.skillLevelId ?? null),
          pictureUrl: masked && !levelHidden ? null : player.avatarRef,
          ...resolveProfileBanner(
            player.banner?.id ?? null,
            () => player.banner ?? undefined,
            banners,
          ),
          masked,
          levelHidden,
          unclaimed,
        },
      ]
    })
  }
  return {
    async page(offset: number, limit: number, viewerId: string | null): Promise<LeaderboardPage> {
      return {
        entries: await entries(top.slice(offset, offset + limit), viewerId),
        total: top.length,
        periodStart: new Date(start).toISOString(),
      }
    },
    async search(query: string, viewerId: string | null) {
      const q = query.trim().toLowerCase()
      const hits = q
        ? (await entries(top, viewerId)).filter(
            (row) =>
              !row.masked &&
              (row.fullName.toLowerCase().includes(q) || row.nickname?.toLowerCase().includes(q)),
          )
        : []
      return { hits, total: hits.length }
    },
    own: (playerId: string) => ownPeriodPosition(standings, playerId),
    /** Call on the annual window so all three periods have their complete history. */
    places(playerIds: readonly string[]) {
      const result = new Map<string, LeaderboardPlace[]>(playerIds.map((id) => [id, []]))
      for (const p of LEADERBOARD_PERIODS) {
        const list =
          p === period
            ? top
            : leaderboardStandings(p, now, candidates, facts).slice(0, LEADERBOARD_LIMIT)
        for (const row of list)
          result.get(row.id)?.push({ period: p, position: row.position, wins: row.wins })
      }
      return result
    },
  }
}

export async function readLeaderboardPlaces(playerIds: readonly string[]) {
  const board = await readPeriodLeaderboard('year')
  return board.places(playerIds)
}
