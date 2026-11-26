import { describe, expect, it } from 'vitest'
import { daysAgo, genSessions, JOSE_SESSIONS, PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import { leaderboardHistoryFacts } from '../leaderboard/history'
import { leaderboardStandings } from '../leaderboard/leaderboard.rules'
import {
  countRecentCountedWins,
  countRecentStandardMatches,
  countYearCountedWins,
  manilaYear,
  rankDisplayStatus,
  recentGameStats,
  sessionWinLoss,
  weeklyPerformance,
  yearGameStats,
} from './player.rules'

const now = PLAYER_FIXTURE_NOW
const input = {
  level: 5,
  state: 'established' as const,
  updatePending: null,
  position: null,
  recentCount: 9,
  matchRequirement: 10,
}
describe('skill-rank progress and status', () => {
  it('nine standard plus twenty fun games cannot meet ten', () => {
    const sessions = genSessions('nine', 9)
    const first = sessions[0]
    if (!first) throw new Error('fixture missing')
    const game = first.games[0]
    if (!game) throw new Error('fixture missing')
    first.games.push(
      ...Array.from({ length: 20 }, (_, i) => ({
        ...game,
        id: `fun-${i}`,
        format: 'fun_4v4' as const,
        counting: 'fun' as const,
      })),
    )
    const count = countRecentStandardMatches(sessions, now)
    expect(count).toBe(9)
  })
  it('old games do not count', () => {
    expect(
      countRecentStandardMatches(
        genSessions('old', 14).map((s) => ({ ...s, finishedAt: daysAgo(100) })),
        now,
      ),
    ).toBe(0)
  })
  it('partial and fun never count even in standard formats', () => {
    const sessions = genSessions('partial', 12).map((s) => ({
      ...s,
      games: s.games.map((g, i) => ({
        ...g,
        counting: i % 2 ? ('partial' as const) : ('fun' as const),
      })),
    }))
    expect(countRecentStandardMatches(sessions, now)).toBe(0)
  })
  it('reassessment takes precedence on the skill card', () => {
    expect(rankDisplayStatus({ ...input, state: 'needs_reassessment', position: 128 })).toBe(
      'needs-reassessment',
    )
  })
  it('missing level is not calculated, never Beginner', () => {
    expect(rankDisplayStatus({ ...input, level: null, position: 1 })).toBe('not-calculated')
  })
  it('preserves prototype status precedence', () => {
    expect(rankDisplayStatus({ ...input, position: 128, updatePending: {} })).toBe('updating')
    expect(rankDisplayStatus({ ...input, position: 128 })).toBe('on-leaderboard')
    expect(rankDisplayStatus({ ...input, recentCount: 12 })).toBe('qualifies')
    expect(rankDisplayStatus(input)).toBe('provisional')
  })
  it('includes the reference boundary but excludes future results', () => {
    const sessions = genSessions('boundary', 3)
    expect(
      countRecentStandardMatches(
        sessions.map((s) => ({ ...s, finishedAt: daysAgo(90) })),
        now,
      ),
    ).toBe(3)
    expect(
      countRecentStandardMatches(
        sessions.map((s) => ({ ...s, finishedAt: daysAgo(-1) })),
        now,
      ),
    ).toBe(0)
  })
})

describe('Stats · last 90 days (#731)', () => {
  it('counts every game inside the rank window, wins and losses, and a whole-percent rate', () => {
    const sessions = genSessions('stats', 12)
    const stats = recentGameStats(sessions, now)
    const inside = sessions
      .filter((x) => Date.parse(x.finishedAt) >= now.getTime() - 90 * 86400000)
      .flatMap((x) => x.games)
    expect(stats?.games).toBe(inside.length)
    expect(stats?.wins).toBe(inside.filter((g) => g.result === 'won').length)
    expect((stats?.wins ?? 0) + (stats?.losses ?? 0)).toBe(stats?.games)
    expect(stats?.winRate).toBe(Math.round(((stats?.wins ?? 0) / (stats?.games ?? 1)) * 100))
  })
  it('is null without games in the window ("No games yet")', () => {
    expect(recentGameStats([], now)).toBeNull()
    const old = genSessions('old', 3).map((x) => ({ ...x, finishedAt: daysAgo(120) }))
    expect(recentGameStats(old, now)).toBeNull()
  })
})

describe('not ranked games (Record games off, D-2026-11-20-02)', () => {
  const ranked = genSessions('ranked', 4).map((s) => ({ ...s, finishedAt: daysAgo(1) }))
  const notRanked = genSessions('not-ranked', 4).map((s) => ({
    ...s,
    id: `nr-${s.id}`,
    finishedAt: daysAgo(1),
    ranked: false,
    games: s.games.map((g) => ({ ...g, id: `nr-${g.id}`, counting: 'not_ranked' as const })),
  }))
  it('add nothing to the win rate, the counted wins or the standard match count', () => {
    const both = [...ranked, ...notRanked]
    expect(yearGameStats(both, now)).toEqual(yearGameStats(ranked, now))
    expect(countYearCountedWins(both, now)).toEqual(countYearCountedWins(ranked, now))
    expect(countRecentStandardMatches(both, now)).toBe(countRecentStandardMatches(ranked, now))
  })
  it('alone read as no games ("No games yet this year")', () => {
    expect(yearGameStats(notRanked, now)).toBeNull()
  })
  it('add nothing to the rank window wins or the weekly performance chart', () => {
    const both = [...ranked, ...notRanked]
    const year = manilaYear(now)
    expect(countRecentCountedWins(both, now)).toEqual(countRecentCountedWins(ranked, now))
    expect(weeklyPerformance(both, year)).toEqual(weeklyPerformance(ranked, year))
    expect(weeklyPerformance(notRanked, year).every((d) => d.wins + d.losses === 0)).toBe(true)
  })
  it('add no leaderboard wins: the standings read the same with and without them', () => {
    const players = [{ id: 'p', fullName: 'P', nickname: null }]
    const standings = (sessions: typeof ranked) =>
      leaderboardStandings('year', now.getTime(), players, leaderboardHistoryFacts({ p: sessions }))
    expect(leaderboardHistoryFacts({ p: notRanked }).some((fact) => fact.standardMatch)).toBe(false)
    expect(standings([...ranked, ...notRanked])).toEqual(standings(ranked))
    expect(standings(notRanked)).toEqual([])
  })
  it("count in the session's own Won and Lost, where fun and partial games never do", () => {
    const g = (counting: string, result: string) => ({ counting, result })
    const night = [g('not_ranked', 'won'), g('not_ranked', 'won'), g('not_ranked', 'lost')]
    const mixed = [g('counted', 'won'), g('fun', 'won'), g('partial', 'lost')]
    expect(sessionWinLoss(night)).toEqual({ wins: 2, losses: 1 })
    expect(sessionWinLoss(mixed)).toEqual({ wins: 1, losses: 0 })
  })
  it('sample: Saturday Doubles Night, 9 days ago, 2 won 1 lost, changes none of the counts', () => {
    const night = JOSE_SESSIONS.find((s) => s.ranked === false)
    expect(night).toMatchObject({
      title: 'Saturday Doubles Night',
      clubName: 'Mandaue Shuttle Society',
      finishedAt: daysAgo(9),
    })
    expect(night?.games.every((game) => game.counting === 'not_ranked')).toBe(true)
    expect(sessionWinLoss(night?.games ?? [])).toEqual({ wins: 2, losses: 1 })
    const without = JOSE_SESSIONS.filter((s) => s !== night)
    const year = manilaYear(now)
    expect(yearGameStats(JOSE_SESSIONS, now)).toEqual(yearGameStats(without, now))
    expect(countYearCountedWins(JOSE_SESSIONS, now)).toEqual(countYearCountedWins(without, now))
    expect(countRecentStandardMatches(JOSE_SESSIONS, now)).toBe(
      countRecentStandardMatches(without, now),
    )
    expect(weeklyPerformance(JOSE_SESSIONS, year)).toEqual(weeklyPerformance(without, year))
  })
})
