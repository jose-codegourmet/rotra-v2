import { describe, expect, it } from 'vitest'
import { daysAgo, genSessions, PLAYER_FIXTURE_NOW } from '../fixtures/playerGames'
import {
  countRecentStandardMatches,
  isLeaderboardEligible,
  orderLeaderboard,
  rankDisplayStatus,
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
describe('prototype ranking eligibility rules', () => {
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
    expect(isLeaderboardEligible(count, 10, 'established')).toBe(false)
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
  it('reassessment removes placement even with old games and a stale position', () => {
    expect(isLeaderboardEligible(0, 10, 'needs_reassessment')).toBe(false)
    expect(rankDisplayStatus({ ...input, state: 'needs_reassessment', position: 128 })).toBe(
      'needs-reassessment',
    )
    expect(
      orderLeaderboard(
        [{ ...input, levelIndex: 5, state: 'needs_reassessment', recentCount: 14 }],
        10,
      ),
    ).toEqual([])
  })
  it('missing level is not calculated, never Beginner', () => {
    expect(rankDisplayStatus({ ...input, level: null, position: 1 })).toBe('not-calculated')
  })
  it('raising the requirement to twelve removes eleven', () => {
    const e = { levelIndex: 5, state: 'established' as const, recentCount: 11 }
    expect(orderLeaderboard([e], 10)).toEqual([e])
    expect(orderLeaderboard([e], 12)).toEqual([])
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
