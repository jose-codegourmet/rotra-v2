import { describe, expect, it } from 'vitest'
import { JOSE_PLAYER_ID } from '../fixtures/players'
import { readMockState } from '../mock/store'
import {
  type LeaderboardFact,
  type LeaderboardIdentity,
  leaderboardPeriodStart,
  leaderboardStandings,
  ownPeriodPosition,
} from './leaderboard.rules'
import { LEADERBOARD_LIMIT, LEADERBOARD_PERIODS, type LeaderboardPeriod } from './leaderboard.types'
import { mockLeaderboard } from './projection'

const now = Date.parse('2026-11-18T19:00:00+08:00')
const priorWeek = Date.parse('2026-11-15T23:59:59+08:00')
const player = (id: string, props: Partial<LeaderboardIdentity> = {}): LeaderboardIdentity => ({
  id,
  fullName: id,
  nickname: null,
  ...props,
})
function game(playerId: string, props: Partial<LeaderboardFact> = {}): LeaderboardFact {
  return {
    playerId,
    playedAt: now,
    standardMatch: true,
    fullParticipation: true,
    valid: true,
    won: true,
    ...props,
  }
}

describe('calendar leaderboards', () => {
  it.each([
    ['week', '2026-11-15T15:59:59.999Z', '2026-11-08T16:00:00Z'],
    ['week', '2026-11-15T16:00:00.000Z', '2026-11-15T16:00:00Z'],
    ['month', '2024-02-29T16:00:00.000Z', '2024-02-29T16:00:00Z'],
    ['month', '2024-02-29T15:59:59.999Z', '2024-01-31T16:00:00Z'],
    ['year', '2026-12-31T15:59:59.999Z', '2025-12-31T16:00:00Z'],
    ['year', '2026-12-31T16:00:00.000Z', '2026-12-31T16:00:00Z'],
  ] satisfies [
    LeaderboardPeriod,
    string,
    string,
  ][])('starts the Manila %s containing %s at %s', (period, at, start) => {
    expect(leaderboardPeriodStart(period, Date.parse(at))).toBe(Date.parse(start))
  })

  it('sorts by wins, exact win rate, account nickname or full name, then player ID', () => {
    const players = [
      player('mid-b', { nickname: 'Alex' }),
      player('mid-a', { fullName: 'Alex' }),
      player('early', { fullName: 'Zorro', nickname: 'Aaron' }),
      player('low-rate'),
      player('loss-only'),
      player('most-wins'),
    ]
    const facts = players.map((p) => game(p.id, { won: p.id !== 'loss-only' }))
    facts.push(
      game('low-rate', { won: false }),
      game('most-wins'),
      game('most-wins', { won: false }),
    )
    const rows = leaderboardStandings('week', now, players, facts)
    expect(rows.map((r) => r.id)).toEqual([
      'most-wins',
      'early',
      'mid-a',
      'mid-b',
      'low-rate',
      'loss-only',
    ])
    expect(rows.at(-1)).toMatchObject({ wins: 0, losses: 1 })
  })

  it('counts full standard matches in valid matches and sessions, up to the request clock', () => {
    const facts = [
      game('one', { standardMatch: false }),
      game('one', { fullParticipation: false }),
      game('one', { valid: false }),
      game('one', { playedAt: now + 1 }),
      game('one'),
      game('none', { playedAt: priorWeek }),
    ]
    expect(leaderboardStandings('week', now, [player('one'), player('none')], facts)).toEqual([
      { id: 'one', position: 1, wins: 1, losses: 0, previousPosition: null },
    ])
  })

  it('admits one-club unclaimed and registered players regardless of the skill-rank count', () => {
    const players = [
      player('registered'),
      ...[0, 1, 2].map((n) => player(String(n), { unclaimedClubCount: n })),
    ]
    const facts = players.map((p) => game(p.id))
    expect(leaderboardStandings('year', now, players, facts).map((r) => r.id)).toEqual([
      '1',
      'registered',
    ])
  })

  it.each(
    LEADERBOARD_PERIODS,
  )('compares the %s with the previous calendar period, including late sync', (period) => {
    const cutoff = leaderboardPeriodStart(period, now)
    const before = cutoff - 1
    const players = ['A', 'B', 'C'].map((id) => player(id))
    const facts = [
      game('A'),
      game('B'),
      game('B'),
      game('C'),
      game('A', { playedAt: before }),
      game('B', { playedAt: before }),
    ]
    const rows = () =>
      leaderboardStandings(period, now, players, facts).map((r) => [r.id, r.previousPosition])
    expect(rows()).toEqual([
      ['B', 2],
      ['A', 1],
      ['C', null],
    ])
    facts.push(game('B', { playedAt: before }))
    expect(rows()).toEqual([
      ['B', 1],
      ['A', 2],
      ['C', null],
    ])
  })

  it('keeps previous and public places inside the top 50, with a private cutoff comparison', () => {
    const players = Array.from({ length: 51 }, (_, i) => player(String(i).padStart(2, '0')))
    const facts = players.flatMap((p) => [game(p.id), game(p.id, { playedAt: priorWeek })])
    const rows = () => leaderboardStandings('week', now, players, facts)
    expect(rows().slice(0, LEADERBOARD_LIMIT)).toHaveLength(50)
    expect(ownPeriodPosition(rows(), '49')).toMatchObject({ position: 50, previousPosition: 50 })
    expect(ownPeriodPosition(rows(), '50')).toEqual({
      position: 51,
      wins: 1,
      losses: 0,
      cutoffWins: 1,
      cutoffHasBetterWinRate: false,
    })
    facts.push(game('50', { won: false }))
    expect(ownPeriodPosition(rows(), '50')).toMatchObject({
      position: 51,
      cutoffWins: 1,
      cutoffHasBetterWinRate: true,
    })
    facts.push(game('50'))
    expect(rows()[0]).toEqual({ id: '50', position: 1, wins: 2, losses: 1, previousPosition: null })
    expect(ownPeriodPosition(rows(), 'absent')).toMatchObject({
      position: null,
      wins: 0,
      cutoffWins: 1,
    })
    expect(ownPeriodPosition([], 'absent')).toEqual({ position: null, wins: 0, losses: 0 })
  })
})

describe('mock leaderboard projections', () => {
  it('shows movement, masks private rows, and includes only single-club unclaimed players', () => {
    const state = readMockState()
    const board = mockLeaderboard(state, 'normal')
    const rows = board.entries('year', null)
    expect(rows).toHaveLength(50)
    expect(rows.some((r) => r.previousPosition === null)).toBe(true)
    expect(rows.some((r) => r.previousPosition === r.position)).toBe(true)
    expect(rows.some((r) => (r.previousPosition ?? r.position) > r.position)).toBe(true)
    expect(rows.some((r) => (r.previousPosition ?? r.position) < r.position)).toBe(true)
    const masked = rows.find((r) => r.masked)
    expect(masked?.nickname).toBeNull()
    expect(masked?.fullName).toContain('***')
    expect(rows.some((r) => r.unclaimed && !r.masked)).toBe(true)
    expect(board.standings('year').some((r) => r.id === 'admin-demo-0')).toBe(false)
    expect(board.places('admin-demo-0')).toEqual([])
    expect(mockLeaderboard(state, 'empty-week').entries('week', null)).toEqual([])
    expect(mockLeaderboard(state, 'empty-week').entries('month', null).length).toBeGreaterThan(0)
  })

  it('returns only public places on profiles and the real cutoff in the private below-50 case', () => {
    const state = readMockState()
    const inside = mockLeaderboard(state, 'in-top-50')
    expect(inside.places(JOSE_PLAYER_ID)).toEqual(
      LEADERBOARD_PERIODS.map((period) => ({ period, position: 17, wins: 1 })),
    )
    const outside = mockLeaderboard(state, 'below-top-50')
    expect(outside.places(JOSE_PLAYER_ID)).toEqual([])
    for (const period of LEADERBOARD_PERIODS) {
      expect(outside.entries(period, JOSE_PLAYER_ID)).toHaveLength(50)
      expect(ownPeriodPosition(outside.standings(period), JOSE_PLAYER_ID)).toMatchObject({
        wins: 1,
        cutoffWins: 1,
        cutoffHasBetterWinRate: true,
      })
    }
  })
})
