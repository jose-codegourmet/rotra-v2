import type { Match, MatchFormat, MatchState } from '../match/match.types'
import { createQueueFixtures } from './queueSessions'
/** Story-only scenarios; the normal store starts with no matches. */
export function createConsoleFixtures(now = Date.now()) {
  const base = createQueueFixtures(now),
    seed = base.sessions[0]
  if (!seed) throw new Error('Missing tonight fixture.')
  const session = {
      ...seed,
      state: 'active' as const,
      startedAt: now - 3600000,
      scheduledEndAt: now + 7200000,
    },
    roster = base.roster.map((p, i) => ({
      ...p,
      level: p.level ?? ('intermediate_mid' as const),
      present: i !== 5,
      levelLockedAt: session.startedAt,
      presentChangedAt: session.startedAt,
    })),
    courts = base.courts
      .filter((c) => c.sessionId === session.id)
      .map((c, i) => ({ ...c, openUntil: i === 2 ? now - 60000 : null }))
  const pid = (i: number) => {
    const p = roster[i]
    if (!p) throw new Error('Missing roster fixture.')
    return p.id
  }
  const court = (i: number) => {
    const c = courts[i]
    if (!c) throw new Error('Missing court fixture.')
    return c.id
  }
  function match(
    n: number,
    a: number[],
    b: number[],
    state: MatchState = 'waiting',
    format: MatchFormat = 'doubles',
  ): Match {
    return {
      id: `console-match-${n}`,
      sessionId: session.id,
      matchNo: n,
      state,
      format,
      queuePosition: n,
      origin: 'manual',
      manualProtected: true,
      teamA: a.map(pid),
      teamB: b.map(pid),
      courtIds: state === 'active' ? [court(0)] : [],
      startedAt: state === 'waiting' ? null : now - 1800000,
      endedAt: state === 'completed' || state === 'invalid' ? now - 600000 : null,
      substitutions: [],
      decision:
        state === 'completed'
          ? {
              kind: 'completed',
              winningTeam: 'A',
              teamAScore: null,
              teamBScore: null,
              confirmedAt: now - 600000,
            }
          : state === 'invalid'
            ? {
                kind: 'invalid',
                winningTeam: null,
                teamAScore: null,
                teamBScore: null,
                confirmedAt: now - 600000,
              }
            : null,
    }
  }
  const playing = match(1, [0, 1], [2, 3], 'active'),
    blocked = match(2, [0, 4], [6, 7]),
    ready = match(3, [4, 6], [7, 8]),
    absent = match(4, [5, 6], [7, 8]),
    completed = match(5, [0, 1], [2, 3], 'completed'),
    scoreless = match(6, [4, 6], [7, 8], 'completed'),
    invalid = match(7, [0, 1], [2, 3], 'invalid')
  completed.teamA[0] = pid(9)
  completed.substitutions = [{ outId: pid(0), inId: pid(9), team: 'A', at: now - 1200000 }]
  completed.decision = {
    kind: 'completed',
    winningTeam: 'A',
    teamAScore: 21,
    teamBScore: 17,
    confirmedAt: now - 600000,
  }
  const matches = [playing, blocked, ready, absent, completed, scoreless, invalid],
    merged = {
      ...playing,
      id: 'console-merged',
      format: 'fun_5v5' as const,
      teamA: [0, 1, 2, 3, 4].map(pid),
      teamB: [6, 7, 8, 9, 10].map(pid),
      courtIds: [court(0), court(1)],
    }
  return {
    session,
    roster,
    courts,
    matches,
    merged: { session, roster, courts, matches: [merged, ...matches.slice(1)] },
  }
}
export const consoleSessionFixture = createConsoleFixtures()
export const mergedConsoleSessionFixture = consoleSessionFixture.merged
