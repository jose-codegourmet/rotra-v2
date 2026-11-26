import { describe, expect, it } from 'vitest'
import type { Match } from './match.types'
import {
  freshPick,
  matchesRested,
  restAfter,
  streakOf,
  tonightLevel,
  whoseTurnText,
} from './matchMaking.rules'

const MIN = 60_000
let seq = 0
/** A doubles match; `start`/`end` in minutes from 0. */
function match(
  teamA: string[],
  teamB: string[],
  opts: {
    state?: Match['state']
    start?: number | null
    end?: number | null
    winner?: 'A' | 'B' | null
  } = {},
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
    placedAt: opts.start == null ? null : opts.start * MIN,
    startedAt: opts.start == null ? null : opts.start * MIN,
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

describe('streakOf (Whose turn, D-2026-11-25-01)', () => {
  it('counts games in a row, On court and Playing included', () => {
    const matches = [
      match(['p', 'a'], ['b', 'c'], { start: 0, end: 15 }),
      match(['p', 'b'], ['a', 'c'], { start: 16, end: 30 }),
      match(['p', 'c'], ['a', 'b'], { state: 'active', start: 31 }),
    ]
    expect(streakOf('p', matches)).toBe(3)
  })
  it('resets when a match started between their games without them', () => {
    const matches = [
      match(['p', 'a'], ['b', 'c'], { start: 0, end: 15 }),
      match(['x', 'y'], ['z', 'w'], { start: 20, end: 35 }),
      match(['p', 'b'], ['a', 'c'], { start: 40, end: 55 }),
    ]
    expect(streakOf('p', matches)).toBe(1)
  })
  it('does not count a match that started on another court while they were still playing', () => {
    const matches = [
      match(['p', 'a'], ['b', 'c'], { start: 0, end: 15 }),
      match(['x', 'y'], ['z', 'w'], { start: 10, end: 25 }),
      match(['p', 'b'], ['a', 'c'], { start: 16, end: 30 }),
    ]
    expect(streakOf('p', matches)).toBe(2)
  })
  it('ignores invalid matches', () => {
    expect(
      streakOf('p', [match(['p', 'a'], ['b', 'c'], { state: 'invalid', start: 0, end: 5 })]),
    ).toBe(0)
  })
})

describe('restAfter', () => {
  it('is 2, or 3 in Hard mode, one fewer with a handicap tonight (D-2026-11-25-03)', () => {
    expect(restAfter({ sessionMode: 'fair' }, { handicapSpots: [] })).toBe(2)
    expect(restAfter({ sessionMode: 'hard' }, {})).toBe(3)
    expect(restAfter({ sessionMode: 'fair' }, { handicapSpots: ['left_knee'] })).toBe(1)
    expect(restAfter({ sessionMode: 'hard' }, { handicapSpots: ['lower_back'] })).toBe(2)
  })
})

describe('matchesRested', () => {
  it('counts matches started since their last game ended, without them', () => {
    const matches = [
      match(['p', 'a'], ['b', 'c'], { start: 0, end: 15 }),
      match(['x', 'y'], ['z', 'w'], { start: 10, end: 25 }),
      match(['x', 'a'], ['z', 'w'], { start: 20, end: 35 }),
      match(['y', 'a'], ['z', 'w'], { state: 'active', start: 40 }),
    ]
    expect(matchesRested({ id: 'p', presentChangedAt: 0 }, matches, 0, 50 * MIN)).toBe(2)
  })
})

describe('tonightLevel (Even game)', () => {
  const player = { id: 'p', level: 'intermediate_mid' as const }
  it('adds 0.25 per net win tonight', () => {
    const won = match(['p', 'a'], ['b', 'c'], { start: 0, end: 10, winner: 'A' })
    expect(tonightLevel(player, [won])).toBe(4.25)
  })
  it('caps the adjustment at one level either way', () => {
    const lost = Array.from({ length: 6 }, (_, i) =>
      match(['p', 'a'], ['b', 'c'], { start: i * 20, end: i * 20 + 10, winner: 'B' }),
    )
    expect(tonightLevel(player, lost)).toBe(3)
  })
  it('counts no level as 4', () => {
    expect(tonightLevel({ id: 'p', level: null }, [])).toBe(4)
  })
})

describe('freshPick (Fresh faces inside Whose turn)', () => {
  const key = (p: string) => [p.startsWith('due') ? 0 : 1]
  it('keeps the Whose turn group when nobody repeats', () => {
    expect(
      freshPick(
        ['a', 'b', 'c'],
        2,
        [],
        () => [0],
        () => false,
      ),
    ).toEqual({
      group: ['a', 'b'],
      avoided: null,
    })
  })
  it('always plays the more due players and swaps only within the tie', () => {
    const clash = (x: string, y: string) => [x, y].sort().join() === ['due1', 'tie1'].sort().join()
    const out = freshPick(['due1', 'tie1', 'tie2', 'tie3'], 2, [], key, clash)
    expect(out.group).toEqual(['due1', 'tie2'])
    expect(out.avoided).toEqual(['due1', 'tie1'])
  })
  it('keeps the repeat when no tied group avoids it', () => {
    const out = freshPick(['due1', 'due2', 'late'], 2, [], key, () => true)
    expect(out).toEqual({ group: ['due1', 'due2'], avoided: null })
  })
  it('places bagging partners first', () => {
    expect(
      freshPick(
        ['a', 'b', 'c', 'd'],
        4,
        ['c', 'd'],
        () => [0],
        () => false,
      ).group,
    ).toEqual(['c', 'd', 'a', 'b'])
  })
})

describe('whoseTurnText', () => {
  it('reads like the mockup', () => {
    expect(whoseTurnText({ tired: true, rested: 2, mode: 'fewest' })).toBe(
      'Not enough rested players',
    )
    expect(whoseTurnText({ tired: false, rested: 1, mode: 'fewest' })).toBe('Rested 1 match')
    expect(whoseTurnText({ tired: false, rested: 0, mode: 'catchup', catchUpTarget: 1 })).toBe(
      'Below 1 game',
    )
    expect(whoseTurnText({ tired: false, rested: 0, mode: 'wait' })).toBe('Longest wait')
  })
})
