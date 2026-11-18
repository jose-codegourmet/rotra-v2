import { savedPlayerWeekStart } from '../club-player/savedPlayerStats.rules'
import { statsYearStart } from '../player/player.rules'
import {
  LEADERBOARD_LIMIT,
  type LeaderboardPeriod,
  type MyPeriodPosition,
} from './leaderboard.types'

/** One player's game in a finished session. Use the original playing time, including on late sync. */
export type LeaderboardFact = {
  playerId: string
  playedAt: number | Date
  standardMatch: boolean
  fullParticipation: boolean
  valid: boolean
  won: boolean
}
export type LeaderboardIdentity = {
  id: string
  fullName: string
  nickname: string | null
  /** Undefined for a registered player, otherwise distinct clubs currently saving this identity. */
  unclaimedClubCount?: number
}
type RecordOfPlay = { wins: number; losses: number }
export type LeaderboardStanding = RecordOfPlay & {
  id: string
  position: number
  previousPosition: number | null
}

export function leaderboardPeriodStart(period: LeaderboardPeriod, now: number): number {
  if (period === 'week') return savedPlayerWeekStart(now)
  if (period === 'year') return statsYearStart(now)
  const offset = 8 * 3_600_000
  const local = new Date(now + offset)
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset
}

const names = new Intl.Collator('en-PH', { sensitivity: 'base' })
/** Compare fractions before rounding; a loss-only record has a win rate of zero. */
function compareWinRate(a: RecordOfPlay, b: RecordOfPlay) {
  return b.wins * (a.wins + a.losses) - a.wins * (b.wins + b.losses)
}

function order(records: Map<string, RecordOfPlay>, players: ReadonlyMap<string, string>) {
  return Array.from(records, ([id, record]) => ({ id, ...record })).sort(
    (a, b) =>
      b.wins - a.wins ||
      compareWinRate(a, b) ||
      names.compare(players.get(a.id) ?? '', players.get(b.id) ?? '') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
}

/** Internal full standings support a private cutoff comparison; public readers take the first 50. */
export function leaderboardStandings(
  period: LeaderboardPeriod,
  now: number,
  candidates: readonly LeaderboardIdentity[],
  facts: readonly LeaderboardFact[],
): LeaderboardStanding[] {
  const start = leaderboardPeriodStart(period, now)
  const previousStart = leaderboardPeriodStart(period, start - 1)
  const players = new Map(
    candidates
      .filter((p) => p.unclaimedClubCount === undefined || p.unclaimedClubCount === 1)
      .map((p) => [p.id, p.nickname?.trim() || p.fullName]),
  )
  const current = new Map<string, RecordOfPlay>()
  const previous = new Map<string, RecordOfPlay>()
  for (const fact of facts) {
    if (
      !fact.valid ||
      !fact.standardMatch ||
      !fact.fullParticipation ||
      !players.has(fact.playerId)
    )
      continue
    const at = Number(fact.playedAt)
    if (!(at >= previousStart && at <= now)) continue
    const totals = at >= start ? current : previous
    const record = totals.get(fact.playerId) ?? { wins: 0, losses: 0 }
    if (fact.won) record.wins++
    else record.losses++
    totals.set(fact.playerId, record)
  }
  const previousPositions = new Map(
    order(previous, players)
      .slice(0, LEADERBOARD_LIMIT)
      .map((row, index) => [row.id, index + 1]),
  )
  return order(current, players).map((row, index) => ({
    ...row,
    position: index + 1,
    previousPosition: previousPositions.get(row.id) ?? null,
  }))
}

export function ownPeriodPosition(
  standings: readonly LeaderboardStanding[],
  playerId: string,
): MyPeriodPosition {
  const row = standings.find((entry) => entry.id === playerId)
  const position = row?.position ?? null
  const record = { position, wins: row?.wins ?? 0, losses: row?.losses ?? 0 }
  if (row && row.position <= LEADERBOARD_LIMIT)
    return { ...record, previousPosition: row.previousPosition }
  const cutoff = standings[LEADERBOARD_LIMIT - 1]
  if (!cutoff) return record
  return {
    ...record,
    cutoffWins: cutoff.wins,
    cutoffHasBetterWinRate: !!row && row.wins === cutoff.wins && compareWinRate(cutoff, row) < 0,
  }
}
