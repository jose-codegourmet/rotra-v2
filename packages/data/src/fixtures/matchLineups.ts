import { autoQueueFingerprint } from '../match/autoQueue.rules'
import type { AutoQueueDraftState } from '../match/autoQueue.types'
import { countedGames, type MatchContext } from '../match/match.rules'
import type { MatchFormat } from '../match/match.types'
import { generateMatches, regenerateScope } from '../match/queue.rules'
import type { PlayingLevel } from '../player/player.types'
import type { SessionMode } from '../queue-session/queueSession.types'
import { levelLabel, shortName } from '../session-roster/sessionRoster.rules'
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
    generateMatches(session, threePresent, matches, 1, () => 0).error ?? 'No valid match right now.'
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

  const draftPlayer = (p: MatchLineupPlayerFixture, suggested: number, playingNow = false) => ({
    id: p.id,
    name: p.shortName,
    fullName: p.name,
    level: p.level,
    played: p.games,
    queued: 1,
    suggested,
    playingNow,
  })
  const draftOne = {
    id: 'draft-available-1',
    format: 'doubles' as const,
    teamA: belowMinimum.teamA.map((p) => draftPlayer(p, 2)),
    teamB: belowMinimum.teamB.map((p) => draftPlayer(p, 2)),
    reason: 'Available players with the lowest planned load',
  }
  const draftTwo = {
    id: 'draft-available-2',
    format: 'doubles' as const,
    teamA: belowMinimum.teamA.map((p) => draftPlayer(p, 2)),
    teamB: belowMinimum.teamB.map((p) => draftPlayer(p, 2)),
    reason: 'The same players may appear in a later future match',
  }
  const draftAhead = {
    id: 'draft-ahead-1',
    format: 'doubles' as const,
    teamA: belowMinimum.teamA.map((p) => draftPlayer(p, 1, true)),
    teamB: someBelow.teamB.map((p) => draftPlayer(p, 1)),
    reason: 'Plan ahead with present players',
    blockedReason: 'A player is playing now; this match waits until they are free.',
  }
  const autoQueueWorkspace = {
    available: { drafts: [draftOne, draftTwo], stopReason: 'Made 2 of 2 matches.' },
    ahead: { drafts: [draftAhead] },
    wait: {
      drafts: [
        { ...draftOne, id: 'draft-wait-1', reason: 'Longest wait after planned assignments' },
      ],
    },
    fewest: {
      drafts: [
        { ...draftOne, id: 'draft-fewest-1', reason: 'Fewest games after planned assignments' },
      ],
    },
    catchup: {
      drafts: [
        {
          ...draftOne,
          id: 'draft-catchup-1',
          teamA: draftOne.teamA.map((p) => ({ ...p, suggested: 1 })),
          teamB: draftOne.teamB.map((p) => ({ ...p, suggested: 1 })),
          reason: 'Below the chosen completed-game target',
        },
      ],
      stopReason: 'Everyone available reaches 3 games with these matches.',
    },
  }

  // Bagging mode (#739): every present player as the Add bagging pair sheet draws them, four pairs
  // (the second on games 1 and 3), and a roster past one page of 24 for the pager.
  const baggingPlayers = roster
    .filter((p) => p.present)
    .map((p) => ({
      id: p.id,
      name: p.nameSnapshot,
      shortName: shortName(p),
      level: p.level,
      levelLabel: p.level ? levelLabel(p.level) : null,
    }))
  const baggingPlayer = (i: number) => {
    const p = baggingPlayers[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p
  }
  const bagging = {
    minimumGames: session.minimumGames,
    players: baggingPlayers,
    pairs: [
      { id: 'bagging-1', a: baggingPlayer(0), b: baggingPlayer(1), games: 'all' as const },
      { id: 'bagging-2', a: baggingPlayer(2), b: baggingPlayer(3), games: [1, 3] },
      { id: 'bagging-3', a: baggingPlayer(4), b: baggingPlayer(5), games: 'all' as const },
      { id: 'bagging-4', a: baggingPlayer(6), b: baggingPlayer(7), games: 'all' as const },
    ],
    manyPlayers: Array.from({ length: 30 }, (_, i) => {
      const p = baggingPlayer(i % baggingPlayers.length)
      return i < baggingPlayers.length ? p : { ...p, id: `${p.id}-again-${i}` }
    }),
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
    autoQueueWorkspace,
    bagging,
    autoQueueCopyStates: {
      shortBatch: {
        drafts: [],
        stopReason: 'Made 0 of 2: not enough free players for another match.',
      },
      targetMet: {
        drafts: [],
        stopReason: 'Everyone available reaches 3 games with these matches.',
      },
      shortfall: {
        drafts: [draftOne, draftTwo],
        stopReason: 'Made 2 of 2 matches. 4 more games are still needed to reach 5.',
      },
    },
    regenerate,
  }
}

export const matchLineupFixtures = createMatchLineupFixtures()

/** Domain drafts remain separate from the UI's formatted story cards and from Match records. */
export function createAutoQueueDraftFixtures(now = Date.now()): AutoQueueDraftState {
  const { session, roster, courts, matches } = createConsoleFixtures(now)
  const eligible = roster.filter(
    (p) =>
      p.present &&
      !matches.some((m) => m.state === 'active' && [...m.teamA, ...m.teamB].includes(p.id)),
  )
  const first = eligible.slice(0, 4).map((p) => p.id)
  const draft = {
    id: 'draft-fixture-available',
    mode: 'available' as const,
    format: 'doubles' as const,
    teamA: first.slice(0, 2),
    teamB: first.slice(2),
    reason: 'Available players with the lowest planned load',
    fingerprint: autoQueueFingerprint(session, { roster, courts, matches }),
  }
  return {
    batches: { available: { drafts: [draft] } },
    selectedIds: [draft.id],
    committedIds: [],
    bagging: { enabled: false, pairs: [] },
  }
}
