import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import {
  autoFillPlacements,
  type MatchContext,
  nextEligibleForCourt,
  notEnoughFreePlayers,
  shortOnPlayers,
} from './match.rules'
import type { Match } from './match.types'

// Courts 1–4 are open (Court 3's booking has ended). Match 1 is Playing on Court 1 (players 0–3);
// match 2 (0, 4, 6, 7) waits on it; match 3 (4, 6, 7, 8) is ready; match 4 has an absent player.
const now = Date.now()
const fixture = createConsoleFixtures(now)
const [playing, blocked, ready, absent] = fixture.matches as [Match, Match, Match, Match]
const court = (i: number) => fixture.courts[i]!.id
const pid = (i: number) => fixture.roster[i]!.id
const waitingMatch = (id: string, position: number, a: number[], b: number[], format?: string) =>
  ({
    ...ready,
    id,
    matchNo: position,
    queuePosition: position,
    format: format ?? 'doubles',
    teamA: a.map(pid),
    teamB: b.map(pid),
  }) as Match
const m8 = waitingMatch('m8', 8, [9, 10], [11, 12]),
  m9 = waitingMatch('m9', 9, [13, 14], [15, 16])
const ctxOf = (matches: Match[], over: Partial<MatchContext> = {}): MatchContext => ({
  roster: fixture.roster,
  courts: fixture.courts,
  matches,
  now,
  ...over,
})
const base = [playing, blocked, ready, absent]

describe('Auto Queue placements', () => {
  it('fills every free open court in court order, a booking-ended court included', () => {
    expect(autoFillPlacements(ctxOf([...base, m8, m9]))).toEqual([
      { matchId: ready.id, courtId: court(1) },
      { matchId: 'm8', courtId: court(2) },
      { matchId: 'm9', courtId: court(3) },
    ])
  })

  it('skips matches that are not ready and never places a player twice', () => {
    const shares = waitingMatch('shares', 8, [4, 6], [7, 8])
    expect(autoFillPlacements(ctxOf([...base, shares]))).toEqual([
      { matchId: ready.id, courtId: court(1) },
    ])
  })

  it('skips 5v5 matches', () => {
    const big = waitingMatch('big', 0, [4, 6, 7, 8, 9], [10, 11, 12, 13, 14], 'fun_5v5')
    const placements = autoFillPlacements(ctxOf([...base, big]))
    expect(placements.map((p) => p.matchId)).not.toContain('big')
    expect(placements).toEqual([{ matchId: ready.id, courtId: court(1) }])
  })

  it('skips courts that are not open yet', () => {
    const courts = fixture.courts.map((c, i) => (i === 1 ? { ...c, startsAt: now + 600000 } : c))
    expect(autoFillPlacements(ctxOf([...base, m8], { courts }))).toEqual([
      { matchId: ready.id, courtId: court(2) },
      { matchId: 'm8', courtId: court(3) },
    ])
  })

  it('refills with a match other than the one sent back', () => {
    const again = waitingMatch('again', 8, [4, 6], [7, 8])
    expect(autoFillPlacements(ctxOf([...base, again]), { exceptMatchId: ready.id })).toEqual([
      { matchId: 'again', courtId: court(1) },
    ])
  })

  it('limits the fill to the courts that just opened or were added', () => {
    expect(autoFillPlacements(ctxOf([...base, m8]), { onlyCourtIds: [court(3)] })).toEqual([
      { matchId: ready.id, courtId: court(3) },
    ])
  })

  it('places nothing when no court is free', () => {
    const held = [court(1), court(2), court(3)].map((id, i) => ({
      ...playing,
      id: `held-${i}`,
      state: 'on_court' as const,
      courtIds: [id],
      teamA: [],
      teamB: [],
    }))
    expect(autoFillPlacements(ctxOf([...base, ...held]))).toEqual([])
  })
})

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
    expect(nextEligibleForCourt(court(1), fewFree, doublesOnly)).toMatchObject({
      match: null,
      notEnoughFreePlayers: true,
    })
    expect(nextEligibleForCourt(court(1), ctxOf(base), doublesOnly)).toMatchObject({
      match: ready,
      notEnoughFreePlayers: false,
    })
  })
})
