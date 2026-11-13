import { describe, expect, it } from 'vitest'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { autoFillPlacements, type MatchContext } from './match.rules'
import type { Match } from './match.types'

// Courts 1–4 are open (Court 3's booking has ended). Match 1 is Playing on Court 1 (players 0–3);
// match 2 (0, 4, 6, 7) waits on it; match 3 (4, 6, 7, 8) is ready; match 4 has an absent player.
const now = Date.now()
const fixture = createConsoleFixtures(now)
const [playing, blocked, ready, absent] = fixture.matches as [Match, Match, Match, Match]
const _court = (i: number) => fixture.courts[i]!.id
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
const _m8 = waitingMatch('m8', 8, [9, 10], [11, 12]),
  _m9 = waitingMatch('m9', 9, [13, 14], [15, 16])
const ctxOf = (matches: Match[], over: Partial<MatchContext> = {}): MatchContext => ({
  roster: fixture.roster,
  courts: fixture.courts,
  matches,
  now,
  ...over,
})
const base = [playing, blocked, ready, absent]

describe('Auto Queue placements', () => {
  it('skips 5v5 matches', () => {
    const big = waitingMatch('big', 0, [4, 6, 7, 8, 9], [10, 11, 12, 13, 14], 'fun_5v5')
    const placements = autoFillPlacements(ctxOf([...base, big]))
    expect(placements.map((p) => p.matchId)).not.toContain('big')
  })
})
