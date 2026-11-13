import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createMatchCardFixtures } from '../fixtures/matchCards'
import type { SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import {
  activeMatches,
  activeMatchFor,
  computeStandings,
  courtMatches,
  creditedPlayers,
  freeCourts,
  type MatchContext,
  nextMatchCandidates,
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
  })
})

describe('substitution game credit', () => {
  // Eve started on Team A and went off; Zoe came in and finished. Team A won.
  const _subbed = (creditTo?: 'none' | 'incoming' | 'outgoing') => {
    const m = game(['Zoe', 'Amy'], ['Ben', 'Dan'])
    m.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo }]
    return m
  }
  it('keeps one person per team slot: a later choice replaces the earlier one', () => {
    const m = game(['Ben', 'Amy'], ['Dan', 'Hal'])
    m.substitutions = [
      { outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo: 'incoming' },
      { outId: 'Zoe', inId: 'Ben', team: 'A', at: 1, creditTo: 'outgoing' },
    ]
    expect([...creditedPlayers(m).keys()]).toEqual(['Zoe'])
    m.substitutions[1]!.creditTo = 'incoming'
    expect([...creditedPlayers(m).keys()]).toEqual(['Ben'])
    // Nobody in a later substitution leaves the earlier choice alone.
    m.substitutions[1]!.creditTo = 'none'
    expect([...creditedPlayers(m).keys()]).toEqual(['Zoe'])
  })
  it('keeps the choices of different slots apart', () => {
    const m = game(['Zoe', 'Amy'], ['Ben', 'Hal'])
    m.substitutions = [
      { outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo: 'incoming' },
      { outId: 'Dan', inId: 'Hal', team: 'B', at: 1, creditTo: 'outgoing' },
    ]
    expect(new Set(creditedPlayers(m).keys())).toEqual(new Set(['Zoe', 'Dan']))
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
    expect(activeMatchFor('Migs', matches, 'placed')).toBeUndefined()
    expect(
      substitutionCandidates(
        lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2']),
        people,
        matches,
      ).map((p) => p.id),
    ).not.toContain('Migs')
  })

  it('are listed apart from Playing matches', () => {
    const playing = lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2'])
    const matches = [placed, playing, free]
    expect(activeMatches(matches).map((m) => m.id)).toEqual(['playing'])
    expect(onCourtMatches(matches).map((m) => m.id)).toEqual(['placed'])
    expect(courtMatches(matches).map((m) => m.id)).toEqual(['placed', 'playing'])
  })
})

describe('next-match candidates', () => {
  it('returns the first five ready matches in queue order and includes game counts', () => {
    const complete = game(['Migs', 'Amy'], ['Ben', 'Dan'])
    const waiting = Array.from({ length: 7 }, (_, i) => ({
      ...lineup(`w${i}`, 'waiting', ['Migs', 'Amy'], ['Ben', 'Dan']),
      queuePosition: 7 - i,
    }))
    const result = nextMatchCandidates('c1', ctxOf([complete, ...waiting]))
    expect(result.map((m) => m.id)).toEqual(['w6', 'w5', 'w4', 'w3', 'w2'])
    expect(result[0]?.gamesByPlayer.Migs).toBe(1)
  })
})

it('offers five ready matches from the live Sunday Night fixture', () => {
  const live = createConsoleFixtures()
  const cards = createMatchCardFixtures().sliderCandidates
  const candidates = nextMatchCandidates(live.courts[1]!.id, {
    roster: live.roster,
    courts: live.courts,
    matches: [live.matches[0]!, ...cards.map((card) => card.match)],
  })
  expect(candidates.map((match) => match.id)).toEqual(cards.map((card) => card.match.id))
})
