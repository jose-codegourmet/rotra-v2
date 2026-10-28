import { FORMAT_LABELS, type MatchContext, matchStatus, shortName } from '../match/match.rules'
import type { Match, MatchStatus } from '../match/match.types'
import type { PlayingLevel } from '../player/player.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import { createConsoleFixtures } from './consoleSessions'

/** One player as a queue card draws them: full name for the label, short name under the picture. */
export type MatchCardPlayerFixture = {
  id: string
  name: string
  shortName: string
  level: PlayingLevel | null
}

/** A waiting match with its status already worked out, ready for a MatchCard story. */
export type MatchCardFixture = {
  match: Match
  formatLabel: string
  status: MatchStatus
  teamA: MatchCardPlayerFixture[]
  teamB: MatchCardPlayerFixture[]
}

/**
 * Story-only queue cards built from the console fixtures: one per status, one per origin, a 5v5
 * that needs two free courts, and a lineup with long names. The normal store starts with no matches.
 */
export function createMatchCardFixtures(now = Date.now()) {
  const scenario = createConsoleFixtures(now)
  const ctx: MatchContext = {
    roster: scenario.roster,
    matches: scenario.matches,
    courts: scenario.courts,
  }
  const pid = (i: number) => {
    const p = scenario.roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const waiting = (n: number) => {
    const m = scenario.matches.find((x) => x.matchNo === n)
    if (!m || m.state !== 'waiting') throw new Error(`Missing waiting match ${n}.`)
    return m
  }
  const player = (roster: SessionPlayer[]) => (id: string) => {
    const p = roster.find((x) => x.id === id)
    if (!p) throw new Error('Missing roster fixture.')
    return { id: p.id, name: p.nameSnapshot, shortName: shortName(p), level: p.level }
  }
  const card = (match: Match, context: MatchContext = ctx): MatchCardFixture => ({
    match,
    formatLabel: FORMAT_LABELS[match.format],
    status: matchStatus(match, context),
    teamA: match.teamA.map(player(context.roster)),
    teamB: match.teamB.map(player(context.roster)),
  })

  // #2 waits on Jose, who is playing on Court 1; #3 can start; #4 has an absent player.
  const blocked = card(waiting(2)),
    ready = card(waiting(3)),
    needsAttention = card(waiting(4))
  const suggested = card({
      ...ready.match,
      id: 'console-match-suggested',
      matchNo: 8,
      queuePosition: 8,
      origin: 'suggested',
      manualProtected: false,
    }),
    auto = card({
      ...ready.match,
      id: 'console-match-auto',
      matchNo: 9,
      queuePosition: 9,
      origin: 'auto',
      manualProtected: false,
    })

  // 5v5 needs two free courts: with only two courts and one game on, one is free.
  const everyonePresent = scenario.roster.map((p) => ({ ...p, present: true }))
  const waitingForCourts = card(
    {
      ...ready.match,
      id: 'console-match-5v5',
      matchNo: 10,
      queuePosition: 10,
      format: 'fun_5v5',
      teamA: [4, 5, 6, 7, 8].map(pid),
      teamB: [9, 10, 11, 12, 13].map(pid),
    },
    { ...ctx, roster: everyonePresent, courts: scenario.courts.slice(0, 2) },
  )

  const longNames = card(ready.match, {
    ...ctx,
    roster: scenario.roster.map((p, i) =>
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
  })

  /** The queue as the Session view's upcoming row shows it, in queue order. */
  const upcoming = [ready, needsAttention, blocked, suggested, auto, waitingForCourts].map(
    (c, i) => ({
      ...c,
      match: { ...c.match, queuePosition: i + 1 },
    }),
  )

  return {
    ready,
    needsAttention,
    blocked,
    waitingForCourts,
    suggested,
    auto,
    protectedManual: ready,
    longNames,
    upcoming,
  }
}

export const matchCardFixtures = createMatchCardFixtures()
