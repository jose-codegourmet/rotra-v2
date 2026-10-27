import { countedGames, type MatchContext } from '../match/match.rules'
import type { MatchFormat } from '../match/match.types'
import { generateMatches, regenerateScope } from '../match/queue.rules'
import type { PlayingLevel } from '../player/player.types'
import type { SessionMode } from '../queue-session/queueSession.types'
import { shortName } from '../session-roster/sessionRoster.rules'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'

/** One player as a match dialog card draws them: picture, name, level and counted games. */
export type MatchLineupPlayerFixture = {
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
  games: number
}

/** A lineup with the session facts the Suggested match sheet explains it with. */
export type MatchLineupFixture = {
  format: MatchFormat
  sessionMode: SessionMode
  minimumGames: number
  teamA: MatchLineupPlayerFixture[]
  teamB: MatchLineupPlayerFixture[]
}

/** The four counts D-REGENERATE shows before rebuilding. */
export type RegenerateScopeFixture = ReturnType<typeof regenerateScope>

/**
 * Story-only lineups and dialog facts built from the console fixtures: a suggestion where players are
 * below the minimum, one where everyone has met it, the reason when no lineup is possible, the Auto
 * queue summary and the Regenerate counts. The normal store starts with no matches.
 */
export function createMatchLineupFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)
  const { session, roster, courts, matches } = scenario
  const ctx: MatchContext = { roster, matches, courts }
  const player =
    (list: SessionPlayer[] = roster) =>
    (i: number): MatchLineupPlayerFixture => {
      const p = list[i]
      if (!p) throw new Error('Missing roster fixture.')
      return {
        id: p.id,
        name: p.nameSnapshot,
        shortName: shortName(p),
        level: p.level,
        games: countedGames(p.id, matches),
      }
    }
  const lineup = (
    a: number[],
    b: number[],
    minimumGames: number,
    format: MatchFormat = 'doubles',
    list: SessionPlayer[] = roster,
  ): MatchLineupFixture => ({
    format,
    sessionMode: session.sessionMode,
    minimumGames,
    teamA: a.map(player(list)),
    teamB: b.map(player(list)),
  })

  // Players 4, 6, 7 and 8 have one counted game each; 10 and 11 have none.
  const belowMinimum = lineup([4, 6], [7, 8], session.minimumGames),
    someBelow = lineup([4, 6], [10, 11], 1),
    everyoneMet = lineup([4, 6], [7, 8], 1),
    singles = lineup([4], [7], session.minimumGames, 'singles'),
    longNames = lineup(
      [4, 6],
      [7, 8],
      session.minimumGames,
      'doubles',
      roster.map((p, i) =>
        i === 4
          ? {
              ...p,
              nameSnapshot: 'Maria Consolacion Villanueva-Bautista',
              nicknameSnapshot: 'Consolacion the smash machine',
            }
          : i === 7
            ? { ...p, nameSnapshot: 'Bartholomew Dimaculangan', nicknameSnapshot: null }
            : p,
      ),
    )

  // Only three present: doubles cannot be built, and the rules say why.
  const threePresent = roster.map((p, i) => ({ ...p, present: i < 3 }))
  const noLineupReason =
    generateMatches(session, threePresent, matches, 1, () => 0).error ??
    'No valid match right now.'
  const bothFormatsOff =
    generateMatches({ ...session, allowDoubles: false }, roster, matches, 1, () => 0).error ??
    'No valid match right now.'

  const autoQueue = {
    sessionMode: session.sessionMode,
    allowSingles: session.allowSingles,
    allowDoubles: session.allowDoubles,
    presentCount: roster.filter((p) => p.present).length,
    minimumGames: session.minimumGames,
  }

  // Waiting matches 2, 3 and 4 are manual; 4 has an absent player, 1 is on court.
  const regenerate = {
    withCounts: regenerateScope(matches, ctx),
    withAutoMatches: regenerateScope(
      matches.map((m) => (m.matchNo === 2 ? { ...m, manualProtected: false } : m)),
      ctx,
    ),
    nothingToRebuild: regenerateScope(
      matches.filter((m) => m.matchNo === 1 || m.matchNo === 3),
      ctx,
    ),
  } satisfies Record<string, RegenerateScopeFixture>

  return {
    session,
    belowMinimum,
    someBelow,
    everyoneMet,
    singles,
    longNames,
    noLineupReason,
    bothFormatsOff,
    autoQueue,
    regenerate,
  }
}

export const matchLineupFixtures = createMatchLineupFixtures()
