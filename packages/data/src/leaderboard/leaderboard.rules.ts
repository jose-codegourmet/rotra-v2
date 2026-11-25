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
  /** The club whose session the game was played in; a club leaderboard counts only its own. */
  clubId?: string
}
export type LeaderboardIdentity = {
  id: string
  fullName: string
  nickname: string | null
  /** Undefined for a registered player, otherwise distinct clubs currently saving this identity. */
  unclaimedClubCount?: number
}
/** Which games a list counts: every club (the ROTRA leaderboard) or one club's sessions only. */
export type LeaderboardScope = { clubId?: string }
type RecordOfPlay = { wins: number; losses: number }
export type LeaderboardStanding = RecordOfPlay & {
  id: string
  /** Shared by the same wins and the same win rate, without gaps (1, 1, 2). */
  position: number
  previousPosition: number | null
}

const MANILA_OFFSET = 8 * 3_600_000

/**
 * The start of the Manila calendar period containing `now`: the year on January 1, the quarter on
 * January 1, April 1, July 1 or October 1, the month on its first day and the week on Monday, each
 * at 00:00 Asia/Manila. The previous period starts at `leaderboardPeriodStart(period, start - 1)`.
 */
export function leaderboardPeriodStart(period: LeaderboardPeriod, now: number): number {
  if (period === 'week') return savedPlayerWeekStart(now)
  if (period === 'year') return statsYearStart(now)
  const local = new Date(now + MANILA_OFFSET)
  const month = local.getUTCMonth()
  return (
    Date.UTC(local.getUTCFullYear(), period === 'quarter' ? month - (month % 3) : month, 1) -
    MANILA_OFFSET
  )
}

const names = new Intl.Collator('en-PH', { sensitivity: 'base' })
/** Compare fractions before rounding; a loss-only record has a win rate of zero. */
function compareWinRate(a: RecordOfPlay, b: RecordOfPlay) {
  return b.wins * (a.wins + a.losses) - a.wins * (b.wins + b.losses)
}
const samePlace = (a: RecordOfPlay, b: RecordOfPlay) =>
  a.wins === b.wins && compareWinRate(a, b) === 0

/**
 * Most wins, then higher win rate. Inside a shared place: the account nickname (full name when
 * there is none), then the player ID; that order never changes the place.
 */
function order(records: Map<string, RecordOfPlay>, players: ReadonlyMap<string, string>) {
  const rows = Array.from(records, ([id, record]) => ({ id, ...record })).sort(
    (a, b) =>
      b.wins - a.wins ||
      compareWinRate(a, b) ||
      names.compare(players.get(a.id) ?? '', players.get(b.id) ?? '') ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
  const placed: (RecordOfPlay & { id: string; position: number })[] = []
  for (const row of rows) {
    const above = placed.at(-1)
    const position = !above ? 1 : samePlace(above, row) ? above.position : above.position + 1
    placed.push({ ...row, position })
  }
  return placed
}

/**
 * The public list: the first 50 rows in standings order, plus anyone who shares the 50th row's
 * place, so a list can run a little over 50 (D-2026-11-25-04, proposed by the mockup).
 */
export function leaderboardTop<R extends { position: number }>(standings: readonly R[]): R[] {
  const cutoff = standings[LEADERBOARD_LIMIT - 1]
  if (!cutoff) return [...standings]
  return standings.filter(
    (row, index) => index < LEADERBOARD_LIMIT || row.position === cutoff.position,
  )
}

/**
 * Internal full standings support a private cutoff comparison; public readers take
 * `leaderboardTop`. A club scope counts only facts from that club's sessions.
 */
export function leaderboardStandings(
  period: LeaderboardPeriod,
  now: number,
  candidates: readonly LeaderboardIdentity[],
  facts: readonly LeaderboardFact[],
  scope: LeaderboardScope = {},
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
      !players.has(fact.playerId) ||
      (scope.clubId !== undefined && fact.clubId !== scope.clubId)
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
    leaderboardTop(order(previous, players)).map((row) => [row.id, row.position]),
  )
  return order(current, players).map((row) => ({
    ...row,
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
  if (row && leaderboardTop(standings).includes(row))
    return { ...record, previousPosition: row.previousPosition }
  const cutoff = standings[LEADERBOARD_LIMIT - 1]
  if (!cutoff) return record
  return {
    ...record,
    cutoffWins: cutoff.wins,
    cutoffHasBetterWinRate: !!row && row.wins === cutoff.wins && compareWinRate(cutoff, row) < 0,
  }
}
