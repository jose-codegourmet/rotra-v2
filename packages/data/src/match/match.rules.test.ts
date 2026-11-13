import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createMatchCardFixtures } from '../fixtures/matchCards'
import type { SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import {
  activeMatches,
  activeMatchFor,
  canMoveCourt,
  canPlace,
  canReplacePlayer,
  canSendBack,
  canStart,
  computeStandings,
  countedGames,
  countedTeam,
  countsFor,
  courtMatches,
  creditedPlayers,
  freeCourts,
  type MatchContext,
  matchStatus,
  nextMatchCandidates,
  onCourtMatches,
  replacedLineup,
  substitutionCandidates,
  substitutionSlots,
  swapTarget,
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

describe('substitution game credit', () => {
  // Eve started on Team A and went off; Zoe came in and finished. Team A won.
  const subbed = (creditTo?: 'none' | 'incoming' | 'outgoing') => {
    const m = game(['Zoe', 'Amy'], ['Ben', 'Dan'])
    m.substitutions = [{ outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo }]
    return m
  }
  it('gives nobody the game by default', () => {
    for (const m of [subbed(), subbed('none')]) {
      expect(countsFor(m, 'Zoe')).toBe(false)
      expect(countsFor(m, 'Eve')).toBe(false)
      expect(countsFor(m, 'Amy')).toBe(true)
    }
  })
  it('gives the incoming player the game, the win and minimum credit', () => {
    const m = subbed('incoming')
    expect(countsFor(m, 'Zoe')).toBe(true)
    expect(countsFor(m, 'Eve')).toBe(false)
    expect(countedGames('Zoe', [m])).toBe(1)
    expect(computeStandings(roster, [m]).find((r) => r.playerId === 'Zoe')).toMatchObject({
      wins: 1,
      losses: 0,
      games: 1,
    })
  })
  it('gives the outgoing player the game with the side they played on', () => {
    const m = subbed('outgoing')
    expect(countsFor(m, 'Eve')).toBe(true)
    expect(countsFor(m, 'Zoe')).toBe(false)
    expect(countedTeam(m, 'Eve')).toBe('A')
    const lost = { ...m, decision: { ...m.decision!, winningTeam: 'B' as const } }
    expect(computeStandings(roster, [lost]).find((r) => r.playerId === 'Eve')).toMatchObject({
      wins: 0,
      losses: 1,
      games: 1,
    })
  })
  it('keeps one person per team slot: a later choice replaces the earlier one', () => {
    const m = game(['Ben', 'Amy'], ['Dan', 'Hal'])
    m.substitutions = [
      { outId: 'Eve', inId: 'Zoe', team: 'A', at: 0, creditTo: 'incoming' },
      { outId: 'Zoe', inId: 'Ben', team: 'A', at: 1, creditTo: 'outgoing' },
    ]
    expect(substitutionSlots(m.substitutions)).toEqual([0, 0])
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
  it('gives nobody anything from an invalid match', () => {
    const m = {
      ...subbed('incoming'),
      state: 'invalid' as const,
      decision: {
        kind: 'invalid' as const,
        winningTeam: null,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: 1,
      },
    }
    expect(countsFor(m, 'Zoe')).toBe(false)
    expect(countsFor(m, 'Amy')).toBe(false)
    expect(computeStandings(roster, [m])).toEqual([])
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

describe('On court actions', () => {
  const placed = lineup('placed', 'on_court', ['Migs', 'Amy'], ['Ben', 'Dan'], ['c1'])
  const playing = lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2'])
  const queued = (
    id: string,
    position: number,
    a: string[],
    b: string[],
    format: Match['format'] = 'doubles',
  ): Match => ({ ...lineup(id, 'waiting', a, b), queuePosition: position, format })

  it('sends back only an On court match', () => {
    expect(canSendBack(placed)).toBe(true)
    expect(canSendBack(playing)).toBe(false)
    expect(canSendBack(queued('w', 1, ['Eve'], ['Fay']))).toBe(false)
  })

  it('moves only onto a free open court, never its own or a held one', () => {
    const three = [...courts, { ...courts[0]!, id: 'c3', label: 'Court 3' }]
    const ctx = { ...ctxOf([placed, playing]), courts: three }
    expect(canMoveCourt(placed, ['c3'], ctx)).toBe(true)
    expect(canMoveCourt(placed, ['c1'], ctx)).toBe(false)
    expect(canMoveCourt(placed, ['c2'], ctx)).toBe(false)
    expect(canMoveCourt(placed, ['c3', 'c3'], ctx)).toBe(false)
    expect(canMoveCourt(playing, ['c3'], ctx)).toBe(false)
    const later = { ...ctx, courts: three.map((c) => (c.id === 'c3' ? { ...c, startsAt: 5 } : c)) }
    expect(canMoveCourt(placed, ['c3'], later)).toBe(false)
  })

  it('replaces a player with a present player who is not busy', () => {
    const away = people.map((p) => (p.id === 'Hal' ? { ...p, present: false } : p))
    const ctx = ctxOf([placed, lineup('other', 'on_court', ['Eve'], ['Fay'], ['c2'])], away)
    expect(canReplacePlayer(placed, 'Amy', 'Gus', ctx)).toBe(true)
    expect(canReplacePlayer(placed, 'Amy', 'Eve', ctx)).toBe(false)
    expect(canReplacePlayer(placed, 'Amy', 'Hal', ctx)).toBe(false)
    expect(canReplacePlayer(placed, 'Amy', 'Ben', ctx)).toBe(false)
    expect(canReplacePlayer(placed, 'Gus', 'Hal', ctx)).toBe(false)
    // Replace during play fixes a mistake (2026-11-13); a finished match can't be changed.
    expect(canReplacePlayer({ ...placed, state: 'active' }, 'Amy', 'Gus', ctx)).toBe(true)
    expect(canReplacePlayer({ ...placed, state: 'completed' }, 'Amy', 'Gus', ctx)).toBe(false)
    expect(replacedLineup(placed, 'Amy', 'Gus')).toEqual({
      format: 'doubles',
      teamA: ['Migs', 'Gus'],
      teamB: ['Ben', 'Dan'],
    })
  })

  it('swap target: Match 1 on Court 1, queue Match 3, Match 4 → Match 3 is next', () => {
    const m3 = queued('m3', 3, ['Eve', 'Fay'], ['Gus', 'Hal'])
    const m4 = queued('m4', 4, ['Eve', 'Gus'], ['Fay', 'Hal'])
    expect(swapTarget(placed, ctxOf([placed, m3, m4]))).toEqual({ match: m3, position: 1 })
  })

  it('swap target counts this match’s players as free and skips matches not ready', () => {
    const busy = queued('busy', 1, ['Eve', 'Migs'], ['Gus', 'Amy'])
    const shares = queued('shares', 2, ['Migs', 'Amy'], ['Ben', 'Dan'])
    // Eve is Playing on Court 2, so `busy` is skipped; `shares` only needs this match's players freed.
    const ctx = ctxOf([placed, playing, busy, shares])
    expect(swapTarget(placed, ctx)).toEqual({ match: shares, position: 2 })
  })

  it('swap target needs the same number of courts, and is null when none is ready', () => {
    const five = ['Eve', 'Fay', 'Gus', 'Hal', 'Migs']
    const big = queued('big', 1, five, ['Amy', 'Ben', 'Dan', 'x', 'y'], 'fun_5v5')
    expect(swapTarget(placed, ctxOf([placed, big]))).toBeNull()
    expect(swapTarget(playing, ctxOf([playing]))).toBeNull()
    const away = people.map((p) => (p.id === 'Eve' ? { ...p, present: false } : p))
    expect(
      swapTarget(placed, ctxOf([placed, queued('m3', 1, ['Eve', 'Fay'], ['Gus', 'Hal'])], away)),
    ).toBeNull()
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
    expect(nextMatchCandidates('c1', ctxOf([complete, ...waiting]), 20)).toHaveLength(5)
  })
  it('returns none when the court is busy', () => {
    const playing = lineup('playing', 'active', ['Migs', 'Amy'], ['Ben', 'Dan'], ['c1'])
    const waiting = lineup('waiting', 'waiting', ['Eve', 'Fay'], ['Gus', 'Hal'])
    expect(nextMatchCandidates('c1', ctxOf([playing, waiting]))).toEqual([])
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
