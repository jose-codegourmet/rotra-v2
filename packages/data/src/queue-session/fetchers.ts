import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import type { QueueSession, QueueSessionSummary } from './queueSession.types'
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
