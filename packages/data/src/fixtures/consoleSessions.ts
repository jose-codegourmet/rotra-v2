import type { Match, MatchFormat, MatchState } from '../match/match.types'
import type { MatchRequest } from '../match-request/matchRequest.types'
import { prototypeDefaultRequestFormats } from '../queue-session/queueSession.types'
import { createQueueFixtures } from './queueSessions'
/** Story-only scenarios; the normal store starts with no matches. */
export function createConsoleFixtures(now = Date.now()) {
  const base = createQueueFixtures(now),
    seed = base.sessions[0]
  if (!seed) throw new Error('Missing tonight fixture.')
  const session = {
      ...seed,
      state: 'active' as const,
      scheduledStartAt: now - 3600000,
      startedAt: now - 3600000,
      scheduledEndAt: now + 7200000,
      // Players can request 2 v 2 and 3 v 3 here, so the seeded 3 v 3 request is allowed.
      requestFormats: { ...prototypeDefaultRequestFormats(seed), fun_3v3: true },
    },
    roster = base.roster.map((p, i) => ({
      ...p,
      level: p.level ?? ('intermediate_mid' as const),
      present: i !== 5,
      levelLockedAt: session.startedAt,
      presentChangedAt: session.startedAt,
      // Row 13 tapped I'm here 20 minutes ago and the QM has not changed it since.
      ...(i === 12 ? { presentChangedAt: now - 1200000, selfCheckedInAt: now - 1200000 } : {}),
    })),
    courts = base.courts
      .filter((c) => c.sessionId === session.id)
      .map((c, i) => ({
        ...c,
        startsAt: session.startedAt,
        openUntil: i === 2 ? now - 60000 : null,
      }))
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
  // Two open match requests for the QM's Requests › Match tab (Q17.2): a 2 v 2 with one Anyone
  // opponent from a player in queue, and a 3 v 3 with Anyone spots. Every named player is present.
  const matchRequests: MatchRequest[] = [
    {
      id: 'match-request-2v2',
      sessionId: session.id,
      pid: pid(4),
      format: 'doubles',
      partners: [pid(6)],
      opponents: [pid(8), null],
      at: now - 900000,
      status: 'open',
      decidedAt: null,
      matchId: null,
    },
    {
      id: 'match-request-3v3',
      sessionId: session.id,
      pid: pid(9),
      format: 'fun_3v3',
      partners: [pid(10), null],
      opponents: [pid(11), null, null],
      at: now - 300000,
      status: 'open',
      decidedAt: null,
      matchId: null,
    },
  ]
  return {
    session,
    roster,
    courts,
    matches,
    matchRequests,
    merged: { session, roster, courts, matches: [merged, ...matches.slice(1)] },
  }
}
export const consoleSessionFixture = createConsoleFixtures()
export const mergedConsoleSessionFixture = consoleSessionFixture.merged

export function createCourtWindowFixtures(now = Date.now()) {
  const base = createConsoleFixtures(now)
  const day = new Date(now)
  day.setHours(19, 30, 0, 0)
  const start = day.getTime()
  const session = {
    ...base.session,
    scheduledStartAt: start,
    scheduledEndAt: start + 3 * 3600000,
    startedAt: start,
  }
  const courts = Array.from({ length: 5 }, (_, i) => ({
    id: `window-court-${i + 1}`,
    sessionId: session.id,
    label: `Court ${i + 1}`,
    startsAt: start + (i >= 3 ? 3600000 : 0),
    openUntil: i === 4 ? start + 2 * 3600000 : null,
    removedAt: null,
  }))
  return { ...base, session, courts, matches: [] }
}
export const courtWindowFixture = createCourtWindowFixtures()

/** Fixed local clock scenarios for Q-ADD-COURT preview verification (#320). */
export const courtPreviewFixture = {
  now: new Date(2026, 10, 1, 12, 12).getTime(),
  actualStart: new Date(2026, 10, 1, 12, 6).getTime(),
  scheduledStart: new Date(2026, 10, 1, 18).getTime(),
  sessionEnd: new Date(2026, 10, 1, 21).getTime(),
  laterSessionEnd: new Date(2026, 10, 1, 23).getTime(),
  startTime: '21:30',
  time: '22:30',
  overnightStart: new Date(2026, 10, 1, 22).getTime(),
  overnightEnd: new Date(2026, 10, 2, 2).getTime(),
}
