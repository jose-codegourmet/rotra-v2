import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { activeMatches, computeStandings, countedGames, courtNames } from '../match/match.rules'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { sessionMinutes } from './queueSession.rules'
import type {
  QueueSession,
  QueueSessionSummary,
  SessionDoneReview,
  SessionFinalization,
  SessionRecordSummary,
} from './queueSession.types'
export function sessionSummary(state: MockState, session: QueueSession): QueueSessionSummary {
  const matches = state.matches.filter((m) => m.sessionId === session.id),
    roster = state.roster.filter((r) => r.sessionId === session.id)
  return {
    ...session,
    courtsInUse: new Set(matches.filter((m) => m.state === 'active').flatMap((m) => m.courtIds))
      .size,
    gamesPlayed: matches.filter((m) => m.state === 'completed').length,
    presentCount: roster.filter((r) => r.present).length,
    rosterCount: roster.length,
    capacity:
      state.courts.filter((c) => c.sessionId === session.id && !c.removedAt).length *
      session.playersPerCourt,
    waitlistCount: state.waitlist.filter((w) => w.sessionId === session.id).length,
    queuedCount: matches.filter((m) => m.state === 'waiting').length,
    downloadedHere: state.downloads[session.id] === 'ready',
  }
}
export async function getQueueSessions(clubId = DEMO_CLUB_ID) {
  await delay()
  const state = readMockState()
  return state.sessions.filter((s) => s.clubId === clubId).map((s) => sessionSummary(state, s))
}
export async function getNowCard(clubId = DEMO_CLUB_ID) {
  const sessions = await getQueueSessions(clubId),
    prepared = sessions
      .filter((s) => s.state === 'prepared')
      .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt),
    live = sessions.find((s) => s.state === 'active')
  return {
    live,
    upcoming: live ? undefined : prepared[0],
    upNext: live ? prepared[0] : undefined,
  }
}
export async function getQueueSession(id: string) {
  await delay()
  const state = readMockState(),
    session = sessionIn(state, id)
  return {
    ...sessionSummary(state, session),
    courts: state.courts.filter((c) => c.sessionId === id && !c.removedAt),
    downloadState: state.downloads[id] ?? 'none',
  }
}
/** Q-SESSION-DONE: derived from roster, matches and the pending count behind the SyncStatus pill. */
export async function getSessionDoneReview(id: string): Promise<SessionDoneReview> {
  await delay()
  const state = readMockState(),
    session = sessionIn(state, id),
    matches = state.matches.filter((m) => m.sessionId === id),
    roster = state.roster.filter((r) => r.sessionId === id),
    courts = state.courts.filter((c) => c.sessionId === id)
  const below = roster
    .map((p) => ({
      clubPlayerId: p.clubPlayerId,
      name: p.nameSnapshot,
      completedGames: countedGames(p.id, matches),
    }))
    .filter((p) => p.completedGames < session.minimumGames)
  return {
    sessionId: id,
    gamesRecorded: matches.filter((m) => m.state === 'completed').length,
    participants: roster.length,
    pendingChanges: state.sync.pendingCount,
    activeGames: activeMatches(matches).map((m) => ({
      matchId: m.id,
      courtLabels: courtNames(m, courts).split(' + '),
    })),
    unplayedWaiting: matches.filter((m) => m.state === 'waiting').length,
    belowMinimum: below,
    minimum: session.minimumGames,
  }
}
/** Status recovery after a lost response; null until a finalization was ever started. */
export async function getFinalizationStatus(id: string): Promise<SessionFinalization | null> {
  await delay(150)
  const state = readMockState()
  sessionIn(state, id)
  return state.finalizations[id] ?? null
}
/** Q-HISTORY totals; an invalid session keeps its partial records out of every count. */
export async function getSessionRecord(id: string): Promise<SessionRecordSummary> {
  await delay()
  const state = readMockState(),
    session = sessionIn(state, id)
  if (session.state !== 'completed' && session.state !== 'invalid')
    throw new MockError('permission', 'This session has no record yet.')
  const invalid = session.state === 'invalid',
    roster = state.roster.filter((r) => r.sessionId === id),
    matches = invalid ? [] : state.matches.filter((m) => m.sessionId === id),
    standings = computeStandings(roster, matches),
    playerSummaries = roster
      .map((p) => {
        const row = standings.find((r) => r.playerId === p.id)
        return {
          sessionPlayerId: p.id,
          clubPlayerId: p.clubPlayerId,
          name: p.nameSnapshot,
          level: p.level,
          completedGames: row?.games ?? 0,
          wins: row?.wins ?? 0,
          losses: row?.losses ?? 0,
        }
      })
      .sort((a, b) => b.completedGames - a.completedGames || a.name.localeCompare(b.name))
  return {
    sessionId: id,
    title: session.title,
    state: session.state,
    invalidReason: session.invalidReason,
    scheduledStartAt: session.scheduledStartAt,
    scheduledEndAt: session.scheduledEndAt,
    startedAt: session.startedAt,
    finalizedAt: session.finalizedAt,
    playerRecordsUpdatedAt: session.playerRecordsUpdatedAt,
    venueName: session.venueName,
    venueAddress: session.venueAddress,
    games: matches.filter((m) => m.state === 'completed').length,
    invalidGames: matches.filter((m) => m.state === 'invalid').length,
    players: roster.length,
    courts: state.courts.filter((c) => c.sessionId === id && !c.removedAt).length,
    lengthMinutes: sessionMinutes(session.scheduledStartAt, session.scheduledEndAt),
    minimumGames: session.minimumGames,
    belowMinimumCount: invalid
      ? 0
      : playerSummaries.filter((p) => p.completedGames < session.minimumGames).length,
    playerSummaries,
  }
}
