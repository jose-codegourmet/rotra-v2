import type { PlayerRank, PlayerSessionRecord } from './player.types'
// Open decision: Window boundaries (calendar months and timezone). 90 days is prototype reference behaviour.
export const WINDOW_DAYS = 90
export function countRecentStandardMatches(
  sessions: readonly PlayerSessionRecord[],
  now: Date | number,
  windowDays = WINDOW_DAYS,
): number {
  const end = Number(now),
    start = end - windowDays * 86400000
  return sessions.reduce((count, session) => {
    const at = Date.parse(session.finishedAt)
    return (
      count +
      (at >= start && at <= end
        ? session.games.filter(
            (g) => g.counting === 'counted' && (g.format === 'singles' || g.format === 'doubles'),
          ).length
        : 0)
    )
  }, 0)
}
/** Counted wins inside the same window as the rank (fun and partial games never count). */
export function countRecentCountedWins(
  sessions: readonly PlayerSessionRecord[],
  now: Date | number,
  windowDays = WINDOW_DAYS,
): { games: number; wins: number } {
  const end = Number(now),
    start = end - windowDays * 86400000
  let games = 0,
    wins = 0
  for (const session of sessions) {
    const at = Date.parse(session.finishedAt)
    if (at < start || at > end) continue
    for (const game of session.games)
      if (game.counting === 'counted') {
        games += 1
        if (game.result === 'won') wins += 1
      }
  }
  return { games, wins }
}
export function isLeaderboardEligible(
  recentCount: number,
  matchRequirement: number,
  rankState: PlayerRank['state'],
): boolean {
  return rankState !== 'needs_reassessment' && recentCount >= matchRequirement
}
export function rankDisplayStatus({
  level,
  state,
  updatePending,
  position,
  recentCount,
  matchRequirement,
}: {
  level: number | null
  state: PlayerRank['state']
  updatePending: unknown
  position: number | null
  recentCount: number
  matchRequirement: number
}) {
  if (level === null) return 'not-calculated'
  if (state === 'needs_reassessment') return 'needs-reassessment'
  if (position !== null) return updatePending ? 'updating' : 'on-leaderboard'
  if (recentCount >= matchRequirement) return 'qualifies'
  return 'provisional'
}
/** Open decision: Numerical ranking. Retain fixture order, filtered by the current requirement; no rating math. */
export function orderLeaderboard<
  T extends { recentCount: number; state: PlayerRank['state']; levelIndex: number | null },
>(entries: readonly T[], matchRequirement: number): T[] {
  return entries.filter(
    (e) => e.levelIndex !== null && isLeaderboardEligible(e.recentCount, matchRequirement, e.state),
  )
}

/** Games, wins, losses and win rate (whole percent) over the rank window; null without games. */
export type RecentGameStats = { games: number; wins: number; losses: number; winRate: number }
/**
 * Stats · last 90 days on the participant profile card (#731): every game in the player's official
 * history (valid finalized sessions) that finished inside the same window as rank. No rating math.
 */
export function recentGameStats(
  sessions: readonly {
    finishedAt: string | null
    games: readonly { result: string }[]
  }[],
  now: Date | number,
  windowDays = WINDOW_DAYS,
): RecentGameStats | null {
  const end = Number(now),
    start = end - windowDays * 86400000
  const games = sessions
    .filter((s) => {
      const at = s.finishedAt ? Date.parse(s.finishedAt) : Number.NaN
      return at >= start && at <= end
    })
    .flatMap((s) => s.games)
  if (!games.length) return null
  const wins = games.filter((g) => g.result === 'won').length
  return {
    games: games.length,
    wins,
    losses: games.length - wins,
    winRate: Math.round((wins / games.length) * 100),
  }
}

/** Club nights are in the Philippines; weekdays and the calendar year are read in Manila time. */
const MANILA = 'Asia/Manila'
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}
/** Day of the week a session finished, Sunday 0 to Saturday 6, in Manila time. */
export function sessionWeekday(finishedAt: string | Date): number {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: MANILA }).format(
    new Date(finishedAt),
  )
  return WEEKDAY_INDEX[day] ?? 0
}
/** The calendar year a date falls in, in Manila time. */
export function manilaYear(at: string | Date | number): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: MANILA }).format(new Date(at)),
  )
}
export type WeekdayRecord = { wins: number; losses: number }
/**
 * Weekly performance (2026-11-13 log, P-MATCH-HISTORY and the profile): counted singles and doubles
 * wins and losses per weekday, Sunday first, over sessions that finished in `year` (the same
 * January 1 reset as Latest stats, D-2026-11-13-03). Fun and partial games never count.
 */
export function weeklyPerformance(
  sessions: readonly {
    finishedAt: string
    games: readonly { counting: string; result: string }[]
  }[],
  year: number,
): WeekdayRecord[] {
  const days = Array.from({ length: 7 }, () => ({ wins: 0, losses: 0 }))
  for (const session of sessions) {
    if (manilaYear(session.finishedAt) !== year) continue
    const day = days[sessionWeekday(session.finishedAt)]
    if (!day) continue
    for (const game of session.games) {
      if (game.counting !== 'counted') continue
      if (game.result === 'won') day.wins++
      else day.losses++
    }
  }
  return days
}

const MANILA_OFFSET_MS = 8 * 3600000

/** The calendar year the profile stats count (Asia/Manila), e.g. 2026 for “Stats · 2026”. */
export function statsYear(now: Date | number) {
  return new Date(Number(now) + MANILA_OFFSET_MS).getUTCFullYear()
}

/**
 * January 1, 00:00 in Asia/Manila (UTC+8, no daylight saving) of the year `now` falls in: profile
 * stats count from here and reset every January 1 (2026-11-13-player-default-banner). The rank keeps
 * its own WINDOW_DAYS window.
 */
export function statsYearStart(now: Date | number) {
  return Date.UTC(statsYear(now), 0, 1) - MANILA_OFFSET_MS
}

/**
 * Stats · YEAR on every profile card (D-PARTICIPANT-PROFILE, Admin Quick view): games, wins, losses
 * and win rate of the official history that finished this calendar year (Asia/Manila), up to `now`.
 * Null without games (“No games yet this year”). No rating math.
 */
export function yearGameStats(
  sessions: readonly {
    finishedAt: string | null
    games: readonly { result: string }[]
  }[],
  now: Date | number,
): RecentGameStats | null {
  const end = Number(now),
    start = statsYearStart(now)
  const games = sessions
    .filter((s) => {
      const at = s.finishedAt ? Date.parse(s.finishedAt) : Number.NaN
      return at >= start && at <= end
    })
    .flatMap((s) => s.games)
  if (!games.length) return null
  const wins = games.filter((g) => g.result === 'won').length
  return {
    games: games.length,
    wins,
    losses: games.length - wins,
    winRate: Math.round((wins / games.length) * 100),
  }
}

/** Counted games and wins this calendar year (the profile card and Share profile “In YEAR”). */
export function countYearCountedWins(
  sessions: readonly PlayerSessionRecord[],
  now: Date | number,
): { games: number; wins: number } {
  const end = Number(now),
    start = statsYearStart(now)
  let games = 0,
    wins = 0
  for (const session of sessions) {
    const at = Date.parse(session.finishedAt)
    if (at < start || at > end) continue
    for (const game of session.games)
      if (game.counting === 'counted') {
        games += 1
        if (game.result === 'won') wins += 1
      }
  }
  return { games, wins }
}
