import { describe, expect, it } from 'vitest'
import type { PlayerForm } from '../session-roster/sessionRoster.types'
import type { Match } from './match.types'
import {
  baseRating,
  formFromHistory,
  formRating,
  isUpset,
  winChance,
  winChanceBreakdown,
} from './winChance.rules'

const MIN = 60_000
let seq = 0
function match(
  teamA: string[],
  teamB: string[],
  opts: { state?: Match['state']; start?: number; end?: number; winner?: 'A' | 'B' } = {},
): Match {
  seq += 1
  const state = opts.state ?? 'completed'
  return {
    id: `m${seq}`,
    sessionId: 's',
    matchNo: seq,
    state,
    format: 'doubles',
    queuePosition: 0,
    origin: 'auto',
    manualProtected: false,
    teamA,
    teamB,
    courtIds: ['c1'],
    placedAt: (opts.start ?? 0) * MIN,
    startedAt: (opts.start ?? 0) * MIN,
    endedAt: opts.end == null ? null : opts.end * MIN,
    substitutions: [],
    decision:
      state === 'completed'
        ? {
            kind: 'completed',
            winningTeam: opts.winner ?? 'A',
            teamAScore: null,
            teamBScore: null,
            confirmedAt: (opts.end ?? 0) * MIN,
          }
        : null,
  }
}
const player = (id: string, level: 'intermediate_low' | 'intermediate_mid', form?: PlayerForm) => ({
  id,
  level,
  form,
})
const lineup = { format: 'doubles' as const, teamA: ['a', 'b'], teamB: ['c', 'd'] }

describe('winChance (D-2026-11-27-02)', () => {
  it('is 50 / 50 for level-matched pairs with no record', () => {
    const players = ['a', 'b', 'c', 'd'].map((id) => player(id, 'intermediate_low'))
    expect(winChance(lineup, players, [])).toEqual({ a: 50, b: 50, favored: null, strong: false })
  })

  it('gives a one-level gap about 76% and marks the pair Favored', () => {
    const players = [
      player('a', 'intermediate_mid'),
      player('b', 'intermediate_mid'),
      player('c', 'intermediate_low'),
      player('d', 'intermediate_low'),
    ]
    expect(winChance(lineup, players, [])).toEqual({ a: 76, b: 24, favored: 'A', strong: true })
  })

  it('treats a guest (no form) as a 50% win rate', () => {
    const guest = player('a', 'intermediate_low')
    const even = player('b', 'intermediate_low', {
      clubWinRate: 0.5,
      bestDay: false,
      place: 0,
      trend: 0,
    })
    expect(baseRating(guest)).toBe(baseRating(even))
  })

  it('lowers the rating for a handicap and for games in a row', () => {
    const players = ['a', 'b', 'c', 'd'].map((id) => player(id, 'intermediate_low'))
    const a = players[0]
    if (!a) throw new Error('no player')
    const fresh = formRating(a, players, [])
    expect(formRating({ ...a, handicapSpots: ['left_knee'] }, players, [])).toBe(fresh - 0.5)
    // One win tonight (+0.25) and one game in a row (−0.25).
    const played = [match(['a', 'b'], ['c', 'd'], { start: 0, end: 15, winner: 'A' })]
    expect(formRating(a, players, played)).toBe(fresh)
  })

  it('marks an Upset when the Favored pair lost', () => {
    const players = [
      player('a', 'intermediate_mid'),
      player('b', 'intermediate_mid'),
      player('c', 'intermediate_low'),
      player('d', 'intermediate_low'),
    ]
    expect(isUpset(match(['a', 'b'], ['c', 'd'], { end: 15, winner: 'B' }), players)).toBe(true)
    expect(isUpset(match(['a', 'b'], ['c', 'd'], { end: 15, winner: 'A' }), players)).toBe(false)
  })
})

describe('winChanceBreakdown', () => {
  const full = {
    id: 'a',
    level: 'intermediate_mid' as const,
    handicapSpots: ['left_knee' as const],
    form: { clubWinRate: 0.62, bestDay: true, place: 1, trend: -1 } as PlayerForm,
  }
  const others = ['b', 'c', 'd'].map((id) => player(id, 'intermediate_low'))
  const players = [full, ...others]
  const keysOf = (rows: { key: string }[]) => rows.map((r) => r.key)

  it('lists a guest with a level and no record', () => {
    const b = winChanceBreakdown(lineup, others.concat(player('a', 'intermediate_low')), [])
    const guest = b.teamA.players.find((p) => p.id === 'a')
    expect(guest?.rows).toEqual([
      { key: 'level', label: 'Level', detail: 'Intermediate Low', value: 3 },
      {
        key: 'club_win_rate',
        label: 'Club win rate',
        detail: 'No record · counts as 50%',
        value: 0,
      },
    ])
  })

  it('counts a player who left the roster as a mid level with no record', () => {
    const b = winChanceBreakdown(lineup, others, [])
    const gone = b.teamA.players.find((p) => p.id === 'a')
    expect(gone?.rows.map((r) => [r.key, r.detail, r.value])).toEqual([
      ['level', 'No level · counts as mid', 4],
      ['club_win_rate', 'No record · counts as 50%', 0],
    ])
  })

  it('lists every signal for a full-signal player', () => {
    const played = [match(['a', 'b'], ['c', 'd'], { start: 0, end: 15, winner: 'A' })]
    const row = winChanceBreakdown(lineup, players, played).teamA.players[0]
    expect(keysOf(row?.rows ?? [])).toEqual([
      'level',
      'club_win_rate',
      'best_day',
      'leaderboard_place',
      'leaderboard_trend',
      'tonight',
      'in_row',
      'handicap',
    ])
    const byKey = Object.fromEntries((row?.rows ?? []).map((r) => [r.key, r]))
    expect(byKey.club_win_rate).toMatchObject({ detail: '62%', value: 0.24 })
    expect(byKey.leaderboard_place).toMatchObject({ detail: 'Top quarter', value: 0.25 })
    expect(byKey.leaderboard_trend).toMatchObject({ detail: 'Falling', value: -0.25 })
    expect(byKey.tonight).toMatchObject({ detail: '1 won · 0 lost', value: 0.25 })
    expect(byKey.in_row).toMatchObject({ detail: '1 before this match', value: -0.25 })
    expect(byKey.handicap).toMatchObject({ detail: 'left knee', value: -0.5 })
  })

  it('uses the lasting rows only for a completed match', () => {
    const played = [match(['a', 'b'], ['c', 'd'], { start: 0, end: 15, winner: 'A' })]
    const b = winChanceBreakdown(played[0] as Match, players, played)
    expect(b.lasting).toBe(true)
    expect(keysOf(b.teamA.players[0]?.rows ?? [])).toEqual([
      'level',
      'club_win_rate',
      'best_day',
      'leaderboard_place',
      'leaderboard_trend',
    ])
    expect(winChanceBreakdown(lineup, players, played).lasting).toBe(false)
  })

  it('marks an upset when the Favored pair lost', () => {
    const strong = [
      player('a', 'intermediate_mid'),
      player('b', 'intermediate_mid'),
      player('c', 'intermediate_low'),
      player('d', 'intermediate_low'),
    ]
    const lost = match(['a', 'b'], ['c', 'd'], { end: 15, winner: 'B' })
    const won = match(['a', 'b'], ['c', 'd'], { end: 15, winner: 'A' })
    expect(winChanceBreakdown(lost, strong, []).upset).toBe(true)
    expect(winChanceBreakdown(won, strong, []).upset).toBe(false)
    expect(winChanceBreakdown(lineup, strong, []).upset).toBe(false)
  })

  it('lists upset wins and losses tonight', () => {
    const strong = [
      player('a', 'intermediate_mid'),
      player('b', 'intermediate_mid'),
      player('c', 'intermediate_low'),
      player('d', 'intermediate_low'),
    ]
    const played = [match(['a', 'b'], ['c', 'd'], { end: 15, winner: 'B' })]
    const win = winChanceBreakdown(lineup, strong, played).teamB.players[0]?.rows.find(
      (r) => r.key === 'upsets',
    )
    expect(win).toMatchObject({ detail: '1 upset win', value: 0.25 })
    const loss = winChanceBreakdown(lineup, strong, played).teamA.players[0]?.rows.find(
      (r) => r.key === 'upsets',
    )
    expect(loss).toMatchObject({ detail: '1 upset loss', value: -0.25 })
  })

  it('matches winChance and sums the rows into each rating', () => {
    const done = match(['a', 'b'], ['c', 'd'], { start: 0, end: 15, winner: 'B' })
    const cases: (Match | typeof lineup)[] = [
      { ...lineup, state: 'waiting' } as never,
      match(['a', 'b'], ['c', 'd'], { state: 'on_court', start: 20 }),
      done,
    ]
    for (const m of cases) {
      const b = winChanceBreakdown(m, players, [done])
      expect(b.chance).toEqual(winChance(m, players, [done]))
      for (const p of [...b.teamA.players, ...b.teamB.players])
        expect(p.rating).toBe(p.rows.reduce((sum, r) => sum + r.value, 0))
    }
    const b = winChanceBreakdown(lineup, players, [done])
    expect(b.teamA.players[0]?.rating).toBe(formRating(full, players, [done]))
  })
})

describe('formFromHistory', () => {
  it('needs 10 decided games for a win rate and 3 games for a best day', () => {
    expect(formFromHistory([{ weekday: 2, wins: 2, losses: 1 }], 2)).toEqual({
      clubWinRate: null,
      bestDay: true,
      place: 0,
      trend: 0,
    })
    const long = formFromHistory(
      [
        { weekday: 2, wins: 6, losses: 2 },
        { weekday: 5, wins: 1, losses: 3 },
      ],
      5,
    )
    expect(long.clubWinRate).toBeCloseTo(7 / 12)
    expect(long.bestDay).toBe(false)
  })
})
