import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { createMatchCardFixtures } from '../fixtures/matchCards'
import {
  activeMatches,
  activeMatchFor,
  courtMatches,
  groupStandings,
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

describe('Standings grouped by position', () => {
  const row = (name: string, position: number, wins: number, losses: number, games: number) => ({
    name,
    position,
    wins,
    losses,
    games,
  })
  const rows = [
    row('Amy', 1, 4, 2, 6),
    row('Ben', 1, 4, 2, 6),
    row('Cat', 2, 2, 1, 3),
    row('Dan', 2, 2, 1, 5),
    row('Eve', 2, 2, 1, 4),
    row('Fay', 3, 0, 3, 3),
  ]

  it('makes one row per position, players in standings order (1, 1, 2, 2, 2, 3 → 1, 2, 3)', () => {
    expect(groupStandings(rows, (r) => r.name)).toEqual([
      { position: 1, players: ['Amy', 'Ben'], wins: 4, losses: 2, games: 6 },
      {
        position: 2,
        players: ['Cat', 'Dan', 'Eve'],
        wins: 2,
        losses: 1,
        games: { min: 3, max: 5 },
      },
      { position: 3, players: ['Fay'], wins: 0, losses: 3, games: 3 },
    ])
  })

  it('keeps the rows as the players without a mapper, and no rows give no positions', () => {
    expect(groupStandings(rows)[0]?.players).toEqual([rows[0], rows[1]])
    expect(groupStandings([])).toEqual([])
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
