import { countedGames, courtNames } from '../match/match.rules'
import type { Match, MatchFormat } from '../match/match.types'
import type { SessionCourt } from '../queue-session/queueSession.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'
import type { MatchLineupPlayerFixture } from './matchLineups'

/** An active match as the Match N result, Confirm match result and Mark match invalid? sheets show it. */
export type MatchResultFixture = {
  matchId: string
  matchNo: number
  format: MatchFormat
  /** "Court 1", or "Court 1" and "Court 2" for 5v5 */
  courtLabels: string[]
  /** The courts joined as the dialogs read them: "Court 1 + Court 2" */
  courtsLabel: string
  minimumGames: number
  teamA: MatchLineupPlayerFixture[]
  teamB: MatchLineupPlayerFixture[]
  /** Short names in lineup order, for "Team A: Mikee and Dexter" */
  teamANames: string[]
  teamBNames: string[]
}

/**
 * Story-only result scenarios built from the console fixtures: the doubles in play on Court 1 and
 * the merged 5v5 on two courts. The normal store starts with no matches.
 */
export function createMatchResultFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)

  const build = (
    m: Match,
    roster: SessionPlayer[],
    courts: SessionCourt[],
    matches: Match[],
  ): MatchResultFixture => {
    const player = (id: string): MatchLineupPlayerFixture => {
      const p = roster.find((r) => r.id === id)
      if (!p) throw new Error('Missing roster fixture.')
      return {
        id: p.id,
        name: p.nameSnapshot,
        shortName: shortName(p),
        level: p.level,
        games: countedGames(p.id, matches),
      }
    }
    const teamA = m.teamA.map(player)
    const teamB = m.teamB.map(player)
    return {
      matchId: m.id,
      matchNo: m.matchNo,
      format: m.format,
      courtLabels: m.courtIds.map((id) => courts.find((c) => c.id === id)?.label ?? 'Court'),
      courtsLabel: courtNames(m, courts),
      minimumGames: scenario.session.minimumGames,
      teamA,
      teamB,
      teamANames: teamA.map((p) => p.shortName),
      teamBNames: teamB.map((p) => p.shortName),
    }
  }

  const playing = scenario.matches.find((m) => m.state === 'active')
  const merged = scenario.merged.matches[0]
  if (!playing || !merged) throw new Error('Missing active match fixture.')

  return {
    /** Match 1, doubles, on Court 1 */
    doubles: build(playing, scenario.roster, scenario.courts, scenario.matches),
    /** The 5v5 fun match on Court 1 + Court 2 */
    fiveVFive: build(
      merged,
      scenario.merged.roster,
      scenario.merged.courts,
      scenario.merged.matches,
    ),
  }
}

export const matchResultFixtures = createMatchResultFixtures()
