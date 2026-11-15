import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createMatchCardFixtures } from '../fixtures/matchCards'
import {
  activeMatches,
  activeMatchFor,
  courtMatches,
  nextMatchCandidates,
  onCourtMatches,
} from './match.rules'
import type { Match } from './match.types'

// The decided match rules (standings, substitution game credit, Put on court, Start, Replace,
// Swap, next-match candidates) have their cases in `@rotra/rule-cases`, run by
// `rule-cases/ruleCases.test.ts`. What stays here reads more than one rule or a fixture.

const lineup = (
  id: string,
  state: Match['state'],
  teamA: string[],
  teamB: string[],
  courtIds: string[] = [],
): Match => ({
  id,
  sessionId: 's',
  matchNo: 1,
  state,
  format: 'doubles',
  queuePosition: 1,
  origin: 'manual',
  manualProtected: true,
  teamA,
  teamB,
  courtIds,
  placedAt: state === 'waiting' ? null : 0,
  startedAt: state === 'active' ? 0 : null,
  endedAt: null,
  substitutions: [],
  decision: null,
})

describe('On court matches', () => {
  const placed = lineup('placed', 'on_court', ['Migs', 'Amy'], ['Ben', 'Dan'], ['c1'])
  const playing = lineup('playing', 'active', ['Eve', 'Fay'], ['Gus', 'Hal'], ['c2'])
  const free = lineup('free', 'waiting', ['Eve', 'Fay'], ['Gus', 'Hal'])

  it('make their players busy, except to the match itself', () => {
    expect(activeMatchFor('Migs', [placed, free])?.id).toBe('placed')
    expect(activeMatchFor('Migs', [placed, free], 'placed')).toBeUndefined()
  })

  it('are listed apart from Playing matches', () => {
    const matches = [placed, playing, free]
    expect(activeMatches(matches).map((m) => m.id)).toEqual(['playing'])
    expect(onCourtMatches(matches).map((m) => m.id)).toEqual(['placed'])
    expect(courtMatches(matches).map((m) => m.id)).toEqual(['placed', 'playing'])
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
