import {
  countedGames,
  courtsNeeded,
  FORMAT_LABELS,
  freeCourts,
  listNames,
  type MatchContext,
  matchStatus,
  shortName,
  waitingMatches,
} from '../match/match.rules'
import type { Match, MatchFormat, MatchStatus } from '../match/match.types'
import type { SessionCourt } from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'
import type { MatchLineupPlayerFixture } from './matchLineups'

/** A free court as the Start match sheet's court buttons show it. */
export type FreeCourtFixture = Pick<SessionCourt, 'id' | 'label'>

/** Everything D-START-MATCH shows for one waiting match, with its status already worked out. */
export type StartMatchFixture = {
  match: Match
  matchNo: number
  format: MatchFormat
  teamA: MatchLineupPlayerFixture[]
  teamB: MatchLineupPlayerFixture[]
  minimumGames: number
  freeCourts: FreeCourtFixture[]
  /** The court that opened the sheet (plus a second free court for 5v5) */
  selectedCourtIds: string[]
  status: MatchStatus
}

/** One row of Q-CHOOSE-MATCH: position, the two teams by short name, format and status. */
export type ChooseMatchRowFixture = {
  matchId: string
  position: number
  teamA: string
  teamB: string
  formatLabel: string
  status: MatchStatus
}

/**
 * Story-only facts for the Start match and Pick another sheets, built from the console fixtures:
 * a ready doubles, a 1v2 fun game, a 5v5 that takes two courts, a blocked match, and the waiting
 * list for one free court. The normal store starts with no matches.
 */
export function createStartMatchFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)
  const { session, roster, courts, matches } = scenario
  const ctx: MatchContext = { roster, matches, courts }
  const pid = (i: number) => {
    const p = roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const waiting = (n: number) => {
    const m = matches.find((x) => x.matchNo === n)
    if (!m || m.state !== 'waiting') throw new Error(`Missing waiting match ${n}.`)
    return m
  }
  const player = (list: SessionPlayer[], ms: Match[]) => (id: string) => {
    const p = list.find((x) => x.id === id)
    if (!p) throw new Error('Missing roster fixture.')
    return {
      id: p.id,
      name: p.nameSnapshot,
      shortName: shortName(p),
      level: p.level,
      games: countedGames(p.id, ms),
    }
  }
  const free = (context: MatchContext): FreeCourtFixture[] =>
    freeCourts(context.courts, context.matches).map((c) => ({ id: c.id, label: c.label }))
  const start = (match: Match, context: MatchContext = ctx): StartMatchFixture => {
    const courtsFree = free(context)
    return {
      match,
      matchNo: match.matchNo,
      format: match.format,
      teamA: match.teamA.map(player(context.roster, context.matches)),
      teamB: match.teamB.map(player(context.roster, context.matches)),
      minimumGames: session.minimumGames,
      freeCourts: courtsFree,
      selectedCourtIds: courtsFree.slice(0, courtsNeeded(match)).map((c) => c.id),
      status: matchStatus(match, context),
    }
  }

  // #3 can start on Court 2 or Court 3; #2 waits on Jose, who is playing on Court 1.
  const doublesReady = start(waiting(3)),
    blocked = start(waiting(2)),
    funOneVTwo = start({
      ...waiting(3),
      id: 'console-match-1v2',
      matchNo: 11,
      queuePosition: 11,
      format: 'fun_1v2',
      teamA: [4].map(pid),
      teamB: [7, 8].map(pid),
    })

  // 5v5 uses two courts as one match: Court 2 and Court 3 are both free.
  const everyonePresent = roster.map((p) => ({ ...p, present: true }))
  const fiveVFive = start(
    {
      ...waiting(3),
      id: 'console-match-5v5',
      matchNo: 10,
      queuePosition: 10,
      format: 'fun_5v5',
      teamA: [4, 5, 6, 7, 8].map(pid),
      teamB: [9, 10, 11, 12, 13].map(pid),
    },
    { ...ctx, roster: everyonePresent },
  )

  /** Pick another for Court 2: #1 blocked (on court), #2 ready, #3 needs attention (absent). */
  const chooseCourt = free(ctx)[0] ?? { id: 'court', label: 'Court' }
  const names = (ids: string[]) =>
    listNames(
      ids.map((id) => {
        const p = roster.find((x) => x.id === id)
        return p ? shortName(p) : 'Player'
      }),
    )
  const chooseMatch = {
    courtId: chooseCourt.id,
    courtLabel: chooseCourt.label,
    rows: waitingMatches(matches).map(
      (m, i): ChooseMatchRowFixture => ({
        matchId: m.id,
        position: i + 1,
        teamA: names(m.teamA),
        teamB: names(m.teamB),
        formatLabel: FORMAT_LABELS[m.format],
        status: matchStatus(m, ctx),
      }),
    ),
  }

  return { session, doublesReady, funOneVTwo, fiveVFive, blocked, chooseMatch }
}

export const startMatchFixtures = createStartMatchFixtures()
