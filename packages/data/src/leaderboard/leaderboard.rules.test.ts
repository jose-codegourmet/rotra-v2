import { describe, expect, it } from 'vitest'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { JOSE_PLAYER_ID } from '../fixtures/players'
import { readMockState } from '../mock/store'
import {
  type LeaderboardFact,
  type LeaderboardIdentity,
  leaderboardPeriodStart,
  leaderboardStandings,
  leaderboardTop,
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
    // Calendar quarters from January 1, April 1, July 1 and October 1 at 00:00 Manila
    ['quarter', '2026-03-31T15:59:59.999Z', '2025-12-31T16:00:00Z'],
    ['quarter', '2026-03-31T16:00:00.000Z', '2026-03-31T16:00:00Z'],
    ['quarter', '2026-06-30T16:00:00.000Z', '2026-06-30T16:00:00Z'],
    ['quarter', '2026-09-30T15:59:59.999Z', '2026-06-30T16:00:00Z'],
    ['quarter', '2026-09-30T16:00:00.000Z', '2026-09-30T16:00:00Z'],
    ['quarter', '2026-11-18T11:00:00.000Z', '2026-09-30T16:00:00Z'],
    ['quarter', '2026-12-31T15:59:59.999Z', '2026-09-30T16:00:00Z'],
  ] satisfies [
    LeaderboardPeriod,
    string,
    string,
  ][])('starts the Manila %s containing %s at %s', (period, at, start) => {
    expect(leaderboardPeriodStart(period, Date.parse(at))).toBe(Date.parse(start))
  })

  it('compares a quarter with the previous calendar quarter, across the new year', () => {
    const q1 = leaderboardPeriodStart('quarter', Date.parse('2027-02-10T12:00:00+08:00'))
    expect(q1).toBe(Date.parse('2027-01-01T00:00:00+08:00'))
    expect(leaderboardPeriodStart('quarter', q1 - 1)).toBe(Date.parse('2026-10-01T00:00:00+08:00'))
    const players = [player('A'), player('B')]
    const facts = [
      game('A', { playedAt: Date.parse('2026-10-01T00:00:00+08:00') }),
      game('B', { playedAt: Date.parse('2026-09-30T23:59:59+08:00') }),
      game('B', { playedAt: Date.parse('2026-12-31T23:59:59+08:00') }),
    ]
    expect(leaderboardStandings('quarter', now, players, facts)).toEqual([
      { id: 'A', position: 1, wins: 1, losses: 0, previousPosition: null },
    ])
    const january = Date.parse('2027-01-05T12:00:00+08:00')
    expect(
      leaderboardStandings('quarter', january, players, [
        ...facts,
        game('A', { playedAt: january }),
      ]),
    ).toEqual([{ id: 'A', position: 1, wins: 1, losses: 0, previousPosition: 1 }])
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
    expect(rows.map((r) => [r.id, r.position])).toEqual([
      ['most-wins', 1],
      // Same wins and win rate share a place; the nickname (else full name), then ID, orders it.
      ['early', 2],
      ['mid-a', 2],
      ['mid-b', 2],
      ['low-rate', 3],
      ['loss-only', 4],
    ])
    expect(rows.at(-1)).toMatchObject({ wins: 0, losses: 1 })
  })

  it('shares a place only on the same wins and the same win rate, numbered without gaps', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => player(id))
    const record = (id: string, wins: number, losses: number) => [
      ...Array.from({ length: wins }, () => game(id)),
      ...Array.from({ length: losses }, () => game(id, { won: false })),
    ]
    const facts = [
      ...record('a', 4, 2),
      ...record('b', 4, 2),
      // Same wins, lower win rate: the next place
      ...record('c', 4, 3),
      // Same win rate (2 of 3), fewer wins: the next place again
      ...record('d', 2, 1),
      // Zero wins: a win rate of zero, whatever the losses
      ...record('e', 0, 1),
      ...record('f', 0, 3),
    ]
    expect(
      leaderboardStandings('week', now, players, facts).map((r) => [r.id, r.position]),
    ).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 2],
      ['d', 3],
      ['e', 4],
      ['f', 4],
    ])
  })

  it("counts only that club's own sessions on a club leaderboard", () => {
    const players = [player('A'), player('B')]
    const facts = [
      game('A', { clubId: 'club-1' }),
      game('A', { clubId: 'club-2' }),
      game('B', { clubId: 'club-1' }),
      game('B', { clubId: 'club-1', won: false }),
      game('B', { clubId: 'club-1', playedAt: priorWeek }),
      game('A'),
    ]
    expect(leaderboardStandings('week', now, players, facts).map((r) => [r.id, r.wins])).toEqual([
      ['A', 3],
      ['B', 1],
    ])
    expect(leaderboardStandings('week', now, players, facts, { clubId: 'club-1' })).toEqual([
      { id: 'A', position: 1, wins: 1, losses: 0, previousPosition: null },
      { id: 'B', position: 2, wins: 1, losses: 1, previousPosition: 1 },
    ])
    expect(leaderboardStandings('week', now, players, facts, { clubId: 'club-3' })).toEqual([])
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
      game('C', { won: false }),
      game('A', { playedAt: before }),
      game('A', { playedAt: before }),
      game('B', { playedAt: before }),
    ]
    const rows = () =>
      leaderboardStandings(period, now, players, facts).map((r) => [
        r.id,
        r.position,
        r.previousPosition,
      ])
    expect(rows()).toEqual([
      ['B', 1, 2],
      ['A', 2, 1],
      ['C', 3, null],
    ])
    facts.push(game('B', { playedAt: before }))
    // Last period's places are shared too: the same wins and win rate.
    expect(rows()).toEqual([
      ['B', 1, 1],
      ['A', 2, 1],
      ['C', 3, null],
    ])
    facts.push(game('B', { playedAt: before }))
    expect(rows()).toEqual([
      ['B', 1, 1],
      ['A', 2, 2],
      ['C', 3, null],
    ])
  })

  it('keeps previous and public places inside the top 50, with a private cutoff comparison', () => {
    const players = Array.from({ length: 52 }, (_, i) => player(String(i).padStart(2, '0')))
    // Fifty-two different records: player i has 52 - i wins, so places run 1 to 52.
    const facts = players.flatMap((p, i) =>
      Array.from({ length: 52 - i }, () => [
        game(p.id),
        game(p.id, { playedAt: priorWeek }),
      ]).flat(),
    )
    const rows = () => leaderboardStandings('week', now, players, facts)
    expect(leaderboardTop(rows())).toHaveLength(50)
    expect(ownPeriodPosition(rows(), '49')).toMatchObject({ position: 50, previousPosition: 50 })
    expect(ownPeriodPosition(rows(), '50')).toEqual({
      position: 51,
      wins: 2,
      losses: 0,
      cutoffWins: 3,
      cutoffHasBetterWinRate: false,
    })
    facts.push(game('50'), game('50', { won: false }))
    expect(ownPeriodPosition(rows(), '50')).toMatchObject({
      position: 51,
      cutoffWins: 3,
      cutoffHasBetterWinRate: true,
    })
    expect(ownPeriodPosition(rows(), 'absent')).toMatchObject({
      position: null,
      wins: 0,
      cutoffWins: 3,
    })
    expect(ownPeriodPosition([], 'absent')).toEqual({ position: null, wins: 0, losses: 0 })
  })

  it("cuts the list at 50 players plus anyone sharing the 50th player's place", () => {
    const players = Array.from({ length: 56 }, (_, i) => player(String(i).padStart(2, '0')))
    // Players 00–47 hold places 1–48 (two wins and i losses); 48–53 share place 49 with one
    // win; 54 and 55 share place 50 with one win and one loss.
    const facts = players.flatMap((p, i) =>
      i < 48
        ? [game(p.id), game(p.id), ...Array.from({ length: i }, () => game(p.id, { won: false }))]
        : i < 54
          ? [game(p.id), game(p.id, { playedAt: priorWeek })]
          : [game(p.id), game(p.id, { won: false }), game(p.id, { playedAt: priorWeek })],
    )
    const standings = leaderboardStandings('week', now, players, facts)
    const top = leaderboardTop(standings)
    expect(top).toHaveLength(54)
    expect(top.at(-1)).toMatchObject({ id: '53', position: 49 })
    expect(standings[LEADERBOARD_LIMIT - 1]).toMatchObject({ id: '49', position: 49 })
    // Inside the list past 50 rows: their own card shows the place, with no cutoff.
    expect(ownPeriodPosition(standings, '53')).toEqual({
      position: 49,
      wins: 1,
      losses: 0,
      previousPosition: 1,
    })
    // Outside the list: the place number is below 50, but the 50-player cut already passed.
    expect(ownPeriodPosition(standings, '54')).toEqual({
      position: 50,
      wins: 1,
      losses: 1,
      cutoffWins: 1,
      cutoffHasBetterWinRate: true,
    })
    // Last week everyone in 48–55 shared one place, so all of them were on that list.
    expect(standings.find((r) => r.id === '55')?.previousPosition).toBe(1)
    expect(leaderboardTop(standings.slice(0, 50))).toHaveLength(50)
  })
})

describe('mock leaderboard projections', () => {
  it('shows movement, full names and pictures, and includes only single-club unclaimed players', () => {
    const state = readMockState()
    const board = mockLeaderboard(state, 'normal')
    const rows = board.entries('year', null)
    expect(rows).toEqual(leaderboardTop(rows))
    expect(rows.length).toBeGreaterThanOrEqual(50)
    expect(rows.some((r) => r.previousPosition === null)).toBe(true)
    expect(rows.some((r) => r.previousPosition === r.position)).toBe(true)
    expect(rows.some((r) => (r.previousPosition ?? r.position) > r.position)).toBe(true)
    expect(rows.some((r) => (r.previousPosition ?? r.position) < r.position)).toBe(true)
    // Leaderboards never mask (D-2026-11-25-04); `masked` only says the profile won't open.
    for (const row of rows) {
      const profile = state.playerProfiles.find((p) => p.playerId === row.id)
      expect(row.fullName).toBe(profile?.fullName)
      expect(row.nickname).toBe(profile?.nickname)
      expect(row.pictureUrl).toBe(profile?.picture)
    }
    expect(rows.some((r) => r.masked)).toBe(true)
    expect(rows.some((r) => r.pictureUrl)).toBe(true)
    expect(rows.some((r) => r.unclaimed && !r.masked)).toBe(true)
    expect(board.standings('year').some((r) => r.id === 'admin-demo-0')).toBe(false)
    expect(board.places('admin-demo-0')).toEqual([])
    expect(mockLeaderboard(state, 'empty-week').entries('week', null)).toEqual([])
    expect(mockLeaderboard(state, 'empty-week').entries('month', null).length).toBeGreaterThan(0)
  })

  it('gives believable quarterly and club lists, with a shared podium place', () => {
    const state = readMockState()
    const board = mockLeaderboard(state, 'normal')
    const sharedPodium = (rows: { position: number }[]) =>
      [1, 2, 3].some((place) => rows.filter((r) => r.position === place).length > 1)
    const quarter = board.entries('quarter', null)
    expect(quarter.length).toBeGreaterThan(3)
    expect(quarter.some((r) => r.previousPosition !== null)).toBe(true)
    expect(sharedPodium(quarter)).toBe(true)
    for (const period of LEADERBOARD_PERIODS) {
      const club = board.entries(period, null, { clubId: DEMO_CLUB_ID })
      const rotra = board.entries(period, null)
      expect(club.length).toBeGreaterThan(0)
      // Club wins are a part of each player's ROTRA wins.
      for (const row of club)
        expect(row.wins).toBeLessThanOrEqual(
          board.standings(period).find((r) => r.id === row.id)?.wins ?? 0,
        )
      expect(club.map((r) => r.wins)).not.toEqual(rotra.map((r) => r.wins))
    }
    expect(board.entries('year', null, { clubId: 'no-such-club' })).toEqual([])
  })

  it('returns only public places on profiles and the real cutoff in the private below-50 case', () => {
    const state = readMockState()
    const inside = mockLeaderboard(state, 'in-top-50')
    expect(inside.places(JOSE_PLAYER_ID)).toEqual(
      LEADERBOARD_PERIODS.map((period) => ({ period, position: 17, wins: 1 })),
    )
    // Everyone below the demo player shares the next place, so the list runs past 50.
    expect(inside.entries('year', JOSE_PLAYER_ID).length).toBeGreaterThan(50)
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
