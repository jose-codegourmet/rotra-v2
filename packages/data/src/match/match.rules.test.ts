import { describe, expect, it } from 'vitest'
import type { SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import {
  activeMatches,
  activeMatchFor,
  canPlace,
  canStart,
  computeStandings,
  courtMatches,
  freeCourts,
  type MatchContext,
  matchStatus,
  onCourtMatches,
  substitutionCandidates,
} from './match.rules'
import type { Match } from './match.types'

const roster: SessionPlayer[] = ['Zoe', 'Amy', 'Ben', 'Dan', 'Eve'].map((name) => ({
  id: name,
  sessionId: 's',
  clubPlayerId: name,
  nameSnapshot: name,
  nicknameSnapshot: null,
  present: true,
  presentChangedAt: 0,
  level: 'intermediate_mid',
  levelLockedAt: 0,
  confirmedAt: 0,
}))
function game(a: string[], b: string[], winner: 'A' | 'B' = 'A'): Match {
  return {
    id: crypto.randomUUID(),
    sessionId: 's',
    matchNo: 1,
    state: 'completed',
    format: 'doubles',
    queuePosition: 1,
    origin: 'manual',
    manualProtected: true,
    teamA: a,
    teamB: b,
    courtIds: [],
    startedAt: 0,
    endedAt: 1,
    substitutions: [],
    decision: {
      kind: 'completed',
      winningTeam: winner,
      teamAScore: null,
      teamBScore: null,
      confirmedAt: 1,
    },
  }
}
describe('live standings', () => {
  it('ranks most wins first and omits players without counted games', () => {
    const rows = computeStandings(roster, [game(['Zoe'], ['Amy']), game(['Zoe'], ['Ben'])])
    expect(rows.map((r) => r.playerId)).toEqual(['Zoe', 'Amy', 'Ben'])
    expect(rows[0]).toMatchObject({ wins: 2, losses: 0, games: 2 })
  })
  it('breaks equal wins by fewer losses before head-to-head', () => {
    const rows = computeStandings(roster, [
      game(['Zoe'], ['Amy']),
      game(['Amy'], ['Ben']),
      game(['Dan'], ['Zoe']),
      game(['Eve'], ['Zoe']),
    ])
    expect(rows.findIndex((r) => r.playerId === 'Amy')).toBeLessThan(
      rows.findIndex((r) => r.playerId === 'Zoe'),
    )
  })
  it('uses opposing head-to-head before alphabetical order', () => {
    const rows = computeStandings(roster, [
      game(['Zoe'], ['Amy']),
      game(['Amy'], ['Ben']),
      game(['Dan'], ['Zoe']),
    ])
    expect(rows.findIndex((r) => r.playerId === 'Zoe')).toBeLessThan(
      rows.findIndex((r) => r.playerId === 'Amy'),
    )
  })
  it('uses name when wins, losses and head-to-head are tied', () => {
    const rows = computeStandings(roster, [game(['Zoe', 'Amy'], ['Ben', 'Dan'])])
    expect(rows.map((r) => r.playerId)).toEqual(['Amy', 'Zoe', 'Ben', 'Dan'])
  })
  it('excludes substitution partials and invalid results', () => {
    const partial = game(['Zoe', 'Amy'], ['Ben', 'Dan'])
    partial.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0 }]
    const invalid = {
      ...game(['Eve'], ['Amy']),
      state: 'invalid' as const,
      decision: {
        kind: 'invalid' as const,
        winningTeam: null,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 1,
      },
    }
    const rows = computeStandings(roster, [partial, invalid])
    expect(rows.map((r) => r.playerId)).toEqual(['Amy', 'Ben', 'Dan'])
    expect(rows.find((r) => r.playerId === 'Amy')).toMatchObject({ wins: 1, losses: 0, games: 1 })
  })
})

const courts: SessionCourt[] = ['Court 1', 'Court 2'].map((label, i) => ({
  id: `c${i + 1}`,
  sessionId: 's',
  label,
  openUntil: null,
  removedAt: null,
}))
const people: SessionPlayer[] = ['Migs', 'Amy', 'Ben', 'Dan', 'Eve', 'Fay', 'Gus', 'Hal'].map(
  (name) => ({ ...roster[0]!, id: name, clubPlayerId: name, nameSnapshot: name }),
)
function lineup(
  id: string,
  state: Match['state'],
  teamA: string[],
  teamB: string[],
  courtIds: string[] = [],
): Match {
  return {
    ...game(teamA, teamB),
    id,
    state,
    courtIds,
    placedAt: state === 'waiting' ? null : 0,
    startedAt: state === 'active' ? 0 : null,
    endedAt: null,
    decision: null,
  }
}
const ctxOf = (matches: Match[], roster = people): MatchContext => ({
  roster,
  matches,
  courts,
  now: 1,
})

describe('On court matches', () => {
  const placed = lineup('placed', 'on_court', ['Migs', 'Amy'], ['Ben', 'Dan'], ['c1'])
  const next = lineup('next', 'waiting', ['Migs', 'Eve'], ['Fay', 'Gus'])
  const free = lineup('free', 'waiting', ['Eve', 'Fay'], ['Gus', 'Hal'])

  it('hold their court and make their players busy', () => {
    const matches = [placed, next, free]
    expect(freeCourts(courts, matches).map((c) => c.id)).toEqual(['c2'])
    expect(activeMatchFor('Migs', matches)?.id).toBe('placed')
    expect(activeMatchFor('Migs', matches, 'placed')).toBeUndefined()
    expect(matchStatus(next, ctxOf(matches))).toEqual({
      kind: 'blocked',
      reason: 'Migs is on Court 1',
    })
    expect(
      substitutionCandidates(
        lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2']),
        people,
        matches,
      ).map((p) => p.id),
    ).not.toContain('Migs')
  })

  it('names a Playing match as playing, not on court', () => {
    const playing = { ...placed, state: 'active' as const, startedAt: 0 }
    expect(matchStatus(next, ctxOf([playing, next])).reason).toBe('Migs is playing on Court 1')
  })

  it('are ready to start without a free court, and never blocked by themselves', () => {
    const full = lineup('full', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2'])
    expect(freeCourts(courts, [placed, full])).toHaveLength(0)
    expect(matchStatus(placed, ctxOf([placed, full]))).toEqual({
      kind: 'ready',
      reason: 'Ready to start',
    })
  })

  it('are listed apart from Playing matches', () => {
    const playing = lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2'])
    const matches = [placed, playing, free]
    expect(activeMatches(matches).map((m) => m.id)).toEqual(['playing'])
    expect(onCourtMatches(matches).map((m) => m.id)).toEqual(['placed'])
    expect(courtMatches(matches).map((m) => m.id)).toEqual(['placed', 'playing'])
  })
})

describe('Put on court and Start match', () => {
  const placed = lineup('placed', 'on_court', ['Migs', 'Amy'], ['Ben', 'Dan'], ['c1'])
  const free = lineup('free', 'waiting', ['Eve', 'Fay'], ['Gus', 'Hal'])

  it('places a ready waiting match only on a free court', () => {
    expect(canPlace(free, ['c2'], ctxOf([placed, free]))).toBe(true)
    expect(canPlace(free, ['c1'], ctxOf([placed, free]))).toBe(false)
    expect(canPlace(free, [], ctxOf([placed, free]))).toBe(false)
    expect(canPlace(placed, ['c2'], ctxOf([placed, free]))).toBe(false)
  })

  it('refuses a second placement of a busy player', () => {
    const busy = lineup('busy', 'waiting', ['Migs', 'Eve'], ['Fay', 'Gus'])
    expect(canPlace(busy, ['c2'], ctxOf([placed, busy]))).toBe(false)
  })

  it('starts an On court match on its own court with no court choice', () => {
    expect(canStart(placed, [], ctxOf([placed]))).toBe(true)
    expect(canStart(placed, ['c1'], ctxOf([placed]))).toBe(true)
    expect(canStart(placed, ['c2'], ctxOf([placed]))).toBe(false)
  })

  it('rechecks presence before starting', () => {
    const away = people.map((p) => (p.id === 'Amy' ? { ...p, present: false } : p))
    expect(canStart(placed, [], ctxOf([placed], away))).toBe(false)
  })

  it('refuses to start a match whose court is not open or no longer its own', () => {
    const later = { ...ctxOf([placed]), courts: courts.map((c) => ({ ...c, startsAt: 5 })) }
    expect(canStart(placed, [], later)).toBe(false)
    const other = lineup('other', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c1'])
    expect(canStart(placed, [], ctxOf([placed, other]))).toBe(false)
  })

  it('keeps the one-step start for a waiting match, and never restarts a Playing one', () => {
    expect(canStart(free, ['c2'], ctxOf([placed, free]))).toBe(true)
    expect(canStart(free, ['c1'], ctxOf([placed, free]))).toBe(false)
    const playing = { ...placed, state: 'active' as const, startedAt: 0 }
    expect(canStart(playing, [], ctxOf([playing]))).toBe(false)
  })
})
