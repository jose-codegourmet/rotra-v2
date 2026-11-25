import 'server-only'
import {
  type LeaderboardFact,
  leaderboardPeriodStart,
  leaderboardStandings,
  leaderboardTop,
  ownPeriodPosition,
} from '@rotra/data/leaderboard/rules'
import {
  LEADERBOARD_PERIODS,
  type LeaderboardPage,
  type LeaderboardPeriod,
  type LeaderboardPlace,
  type LeaderboardRow,
} from '@rotra/data/leaderboard/types'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import { readShownProfileBanners } from '../admin/profile-banners'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { levelCodeFor } from '../queue/session-store'
import { ServiceError } from '../service/errors'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseLeaderboardPeriod(value: string | null): LeaderboardPeriod {
  if (value === null) return 'year'
  const period = LEADERBOARD_PERIODS.find((p) => p === value)
  if (!period) throw new ServiceError('invalid')
  return period
}

/** `?offset=&limit=&period=` of a leaderboard page read: pages of 1 to 50 rows. */
export function parseLeaderboardPage(params: URLSearchParams) {
  const offset = Number(params.get('offset') ?? 0)
  const limit = Number(params.get('limit') ?? 25)
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  )
    throw new ServiceError('invalid')
  return { offset, limit, period: parseLeaderboardPeriod(params.get('period')) }
}

/** A club's leaderboard (D-2026-11-25-04) needs a club that exists; anything else is not found. */
export async function requireLeaderboardClub(
  clubId: string,
  db: Prisma.TransactionClient = prisma,
) {
  if (!UUID.test(clubId)) throw new ServiceError('not_found')
  const club = await db.club.findUnique({ where: { id: clubId }, select: { id: true } })
  if (!club) throw new ServiceError('not_found')
}

/**
 * Load the two relevant periods once. A profile or Compare loads the annual window for all four
 * (a quarter, month or week and the one before it always fall inside this year and last year).
 * `clubId` reads that club's leaderboard: only facts of its own sessions (D-2026-11-25-04).
 * Names, nicknames and pictures are never masked on a leaderboard (same decision).
 */
export async function readPeriodLeaderboard(
  period: LeaderboardPeriod,
  {
    now = Date.now(),
    db = prisma,
    clubId,
  }: { now?: number; db?: Prisma.TransactionClient; clubId?: string } = {},
) {
  const start = leaderboardPeriodStart(period, now)
  const previousStart = leaderboardPeriodStart(period, start - 1)
  const records = await db.playerMatchFact.findMany({
    where: {
      ...(clubId ? { clubId } : {}),
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
  const top = leaderboardTop(standings)
  const entries = async (rows: typeof top, viewerId: string | null): Promise<LeaderboardRow[]> => {
    if (!rows.length) return []
    const banners = await readShownProfileBanners(db)
    return rows.flatMap((row) => {
      const player = identity.get(row.id)
      if (!player) return []
      const unclaimed = player.unclaimedClubCount === 1
      const levelHidden =
        !unclaimed && player.profileVisibility === 'always_private' && viewerId !== row.id
      // Only what a tap opens: the row keeps the full name, nickname and picture.
      const masked =
        levelHidden || (!unclaimed && !viewerId && player.profileVisibility === 'private')
      return [
        {
          ...row,
          fullName: player.fullName,
          nickname: player.nickname,
          playingLevel: levelHidden ? null : levelCodeFor(player.rankCurrent?.skillLevelId ?? null),
          pictureUrl: player.avatarRef,
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
              row.fullName.toLowerCase().includes(q) || row.nickname?.toLowerCase().includes(q),
          )
        : []
      return { hits, total: hits.length }
    },
    own: (playerId: string) => ownPeriodPosition(standings, playerId),
    /** Call on the ROTRA annual window so all four periods have their complete history. */
    places(playerIds: readonly string[]) {
      const result = new Map<string, LeaderboardPlace[]>(playerIds.map((id) => [id, []]))
      for (const p of LEADERBOARD_PERIODS) {
        const list =
          p === period ? top : leaderboardTop(leaderboardStandings(p, now, candidates, facts))
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
