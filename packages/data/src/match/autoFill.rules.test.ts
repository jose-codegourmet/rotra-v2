import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { type MatchContext, notEnoughFreePlayers, shortOnPlayers } from './match.rules'
import type { Match } from './match.types'

// Match 1 is Playing on Court 1 (players 0–3); courts 1–4 are open.
const now = Date.now()
const fixture = createConsoleFixtures(now)
const [playing] = fixture.matches as [Match]
const ctxOf = (matches: Match[], over: Partial<MatchContext> = {}): MatchContext => ({
  roster: fixture.roster,
  courts: fixture.courts,
  matches,
  now,
  ...over,
})

// Auto Queue placements and the next eligible match for a court have their cases in
// `@rotra/rule-cases` (courtfill/autoFillPlacements, courtfill/nextEligibleForCourt).

describe('Short on players', () => {
  const doublesOnly = { allowDoubles: true, allowSingles: false },
    both = { allowDoubles: true, allowSingles: true }
  const presentOnly = (ids: number[]) =>
    fixture.roster.map((p, i) => ({ ...p, present: ids.includes(i) }))

  it('7 present on four courts: enough for 1 doubles court, 3 sit out', () => {
    const ctx = ctxOf([playing], { roster: presentOnly([0, 1, 2, 3, 4, 6, 7]) })
    expect(shortOnPlayers(doublesOnly, ctx)).toEqual({
      present: 7,
      doublesCourts: 1,
      singlesCourts: 0,
      sitOut: 3,
      standardFormat: 'doubles',
    })
  })

  it('with both formats on: 1 doubles court and 1 singles court', () => {
    const ctx = ctxOf([playing], { roster: presentOnly([0, 1, 2, 3, 4, 6, 7]) })
    expect(shortOnPlayers(both, ctx)).toMatchObject({
      doublesCourts: 1,
      singlesCourts: 1,
      sitOut: 1,
    })
  })

  it('too few for any game names the standard format', () => {
    const ctx = ctxOf([], { roster: presentOnly([0, 1, 2]) })
    expect(shortOnPlayers(doublesOnly, ctx)).toEqual({
      present: 3,
      doublesCourts: 0,
      singlesCourts: 0,
      sitOut: 3,
      standardFormat: 'doubles',
    })
  })

  it('no banner when the free players can fill every free open court, or no court is free', () => {
    expect(shortOnPlayers(doublesOnly, ctxOf([]))).toBeNull()
    const held = fixture.courts.map((c, i) => ({
      ...playing,
      id: `held-${i}`,
      courtIds: [c.id],
      teamA: [],
      teamB: [],
    }))
    const ctx = ctxOf(held, { roster: presentOnly([0, 1, 2]) })
    expect(shortOnPlayers(doublesOnly, ctx)).toBeNull()
  })

  it('"Not enough free players." below the smallest standard match', () => {
    const fewFree = ctxOf([playing], { roster: presentOnly([0, 1, 2, 3, 4, 6]) })
    expect(notEnoughFreePlayers(doublesOnly, fewFree)).toBe(true)
    expect(notEnoughFreePlayers(both, fewFree)).toBe(false)
    expect(notEnoughFreePlayers(doublesOnly, ctxOf([playing]))).toBe(false)
  })
})
