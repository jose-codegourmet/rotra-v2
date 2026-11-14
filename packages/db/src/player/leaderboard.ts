import 'server-only'
import type { LeaderboardEntry } from '@rotra/data/leaderboard/types'
import type { PlayingLevel } from '@rotra/data/player/types'
import { resolveProfileBanner } from '@rotra/data/profile-banner/rules'
import { maskPublicName } from '@rotra/data/public-session/rules'
import { readShownProfileBanners } from '../admin/profile-banners'
import { prisma } from '../client/prisma'
import type { Prisma } from '../generated/prisma/client'
import { APPROVED_RANK_ALGORITHMS } from './projections'

/**
 * P-LEADERBOARD (`leaderboard.list` and the signed-in "my position"), read from the stored
 * `player_rank_current` projection only. Nothing here calculates a rank.
 *
 * No rank formula is approved (#247): while `APPROVED_RANK_ALGORITHMS` is empty these reads return
 * the screen's truthful empty state ("No players qualify for the leaderboard yet") without touching
 * the database, never fixture or computed positions. Once an algorithm is approved, only rows it
 * produced that are leaderboard-eligible with a stored rank and level are listed, in the stored
 * order already used by `readLeaderboard` (rank, then player ID). Tie precedence is still #247.
 */
export type LeaderboardRow = LeaderboardEntry & {
  position: number
  masked?: boolean
  levelHidden?: boolean
}

const approvedAlgorithms = () => [...APPROVED_RANK_ALGORITHMS]

const listedWhere = (): Prisma.PlayerRankCurrentWhereInput => ({
  leaderboardEligible: true,
  numericRank: { not: null },
  skillLevelId: { not: null },
  algorithmVersion: { in: approvedAlgorithms() },
})

const ORDER: Prisma.PlayerRankCurrentOrderByWithRelationInput[] = [
  { numericRank: 'desc' },
  { playerId: 'asc' },
]

const ROW_SELECT = {
  playerId: true,
  numericRank: true,
  skillLevel: { select: { code: true } },
  player: {
    select: {
      fullName: true,
      nickname: true,
      avatarRef: true,
      profileVisibility: true,
      banner: { select: { id: true, image: true } },
    },
  },
} as const

type ShownBanners = Awaited<ReturnType<typeof readShownProfileBanners>>

type Row = Prisma.PlayerRankCurrentGetPayload<{ select: typeof ROW_SELECT }>

/**
 * Public fields only: no contacts, rank components, evidence counts or private identity. This read is
 * cached for every viewer, so an always-private player (D-2026-11-12-01) is masked here for everyone,
 * their own row included; the picture, the Profile banner and position stay, the level is hidden.
 * The banner is public like the picture (D-2026-11-11-11), so masked rows carry it too.
 */
const entryOf = (row: Row, position: number, shownBanners: ShownBanners): LeaderboardRow => {
  const masked = row.player.profileVisibility === 'always_private'
  return {
    id: row.playerId,
    fullName: masked ? maskPublicName(row.player.fullName) : row.player.fullName,
    nickname: masked ? null : row.player.nickname,
    playingLevel: row.skillLevel?.code as PlayingLevel,
    pictureUrl: row.player.avatarRef,
    ...resolveProfileBanner(
      row.player.banner?.id ?? null,
      () => row.player.banner ?? undefined,
      shownBanners,
    ),
    position,
    ...(masked ? { masked: true, levelHidden: true } : {}),
  }
}

/** 1 + listed rows ahead of this one in the stored order. */
async function positionOf(row: Pick<Row, 'playerId' | 'numericRank'>) {
  if (row.numericRank === null) return null
  const ahead = await prisma.playerRankCurrent.count({
    where: {
      ...listedWhere(),
      OR: [
        { numericRank: { gt: row.numericRank } },
        { numericRank: row.numericRank, playerId: { lt: row.playerId } },
      ],
    },
  })
  return ahead + 1
}

export async function readLeaderboardPage({ offset, limit }: { offset: number; limit: number }) {
  if (!APPROVED_RANK_ALGORITHMS.size) return { entries: [] as LeaderboardRow[], total: 0 }
  const [rows, total] = await prisma.$transaction([
    prisma.playerRankCurrent.findMany({
      where: listedWhere(),
      orderBy: ORDER,
      skip: offset,
      take: limit,
      select: ROW_SELECT,
    }),
    prisma.playerRankCurrent.count({ where: listedWhere() }),
  ])
  const shownBanners = await readShownProfileBanners()
  return { entries: rows.map((row, i) => entryOf(row, offset + i + 1, shownBanners)), total }
}

/** Name or nickname search over listed players only; the first 50 hits plus the full count. */
export async function searchLeaderboard(query: string) {
  const q = query.trim()
  if (!q || !APPROVED_RANK_ALGORITHMS.size) return { hits: [] as LeaderboardRow[], total: 0 }
  // Masked names never match a search.
  const where: Prisma.PlayerRankCurrentWhereInput = {
    ...listedWhere(),
    player: {
      profileVisibility: { not: 'always_private' },
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { nickname: { contains: q, mode: 'insensitive' } },
      ],
    },
  }
  const [rows, total] = await prisma.$transaction([
    prisma.playerRankCurrent.findMany({ where, orderBy: ORDER, take: 50, select: ROW_SELECT }),
    prisma.playerRankCurrent.count({ where }),
  ])
  const shownBanners = await readShownProfileBanners()
  const hits = await Promise.all(
    rows.map(async (row) => entryOf(row, (await positionOf(row)) ?? 0, shownBanners)),
  )
  return { hits, total }
}

/** The signed-in player's own position, or null when they are not listed. */
export async function readMyLeaderboardPosition(playerId: string) {
  if (!APPROVED_RANK_ALGORITHMS.size) return null
  const row = await prisma.playerRankCurrent.findFirst({
    where: { ...listedWhere(), playerId },
    select: { playerId: true, numericRank: true },
  })
  return row ? positionOf(row) : null
}
