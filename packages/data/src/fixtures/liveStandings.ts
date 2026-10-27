import { computeStandings } from '../match/match.rules'
import type { Match } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import { createConsoleFixtures } from './consoleSessions'

/** One row of the live leaderboard: the standings maths plus the player's locked level. */
export type LiveStandingRow = {
  playerId: string
  name: string
  level: PlayingLevel | null
  wins: number
  losses: number
  games: number
}

/**
 * Story-only standings for the tonight console fixture. `rows` adds four more completed games so
 * the table has a clear leader, a three-way tie on wins broken by losses and head-to-head, and a
 * bottom tie broken by name. `tiedRows` is the console fixture as is: three players at 1–0 and four
 * at 0–1, every tie resolved by head-to-head or name. The normal store starts with no matches.
 */
export function createLiveStandingsFixtures(now = Date.now()) {
  const fixture = createConsoleFixtures(now)
  const pid = (i: number) => {
    const p = fixture.roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  function completed(n: number, a: number[], b: number[], winningTeam: 'A' | 'B'): Match {
    return {
      id: `console-standings-${n}`,
      sessionId: fixture.session.id,
      matchNo: n,
      state: 'completed',
      format: 'doubles',
      queuePosition: n,
      origin: 'manual',
      manualProtected: true,
      teamA: a.map(pid),
      teamB: b.map(pid),
      courtIds: [],
      startedAt: now - 3000000,
      endedAt: now - 1800000,
      substitutions: [],
      decision: {
        kind: 'completed',
        winningTeam,
        teamAScore: null,
        teamBScore: null,
        confirmedAt: now - 1800000,
      },
    }
  }
  const extra = [
    completed(10, [1, 2], [3, 4], 'A'),
    completed(11, [1, 6], [7, 8], 'A'),
    completed(12, [2, 4], [6, 10], 'A'),
    completed(13, [3, 7], [8, 11], 'B'),
  ]
  const withLevel = (matches: Match[]): LiveStandingRow[] =>
    computeStandings(fixture.roster, matches).map((r) => ({
      ...r,
      level: fixture.roster.find((p) => p.id === r.playerId)?.level ?? null,
    }))
  return {
    minimumGames: fixture.session.minimumGames,
    rows: withLevel([...fixture.matches, ...extra]),
    tiedRows: withLevel(fixture.matches),
  }
}

export const liveStandingsFixture = createLiveStandingsFixtures()
