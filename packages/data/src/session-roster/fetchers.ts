import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'
import { realGetSessionRoster } from '../real/queue'

/** Operator data; join-request contacts never enter saved-player or public directory projections. */
export async function getSessionRoster(sessionId: string) {
  if (isRealDataMode()) return realGetSessionRoster(sessionId)
  await delay()
  const state = readMockState()
  const session = sessionIn(state, sessionId)
  // Same rule as `ClubSessionPlayerSummary` in projections: a prior finalized session at this club.
  const priorSessionIds = new Set(
    state.sessions
      .filter(
        (other) =>
          other.id !== sessionId &&
          other.clubId === session.clubId &&
          other.state === 'completed' &&
          other.finalizedAt != null,
      )
      .map((other) => other.id),
  )
  const returning = new Set(
    state.roster.filter((row) => priorSessionIds.has(row.sessionId)).map((row) => row.clubPlayerId),
  )
  return {
    roster: state.roster
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.confirmedAt - b.confirmedAt)
      .map((r) => ({
        ...r,
        hasPlayedAtClubBefore: returning.has(r.clubPlayerId),
      })),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === sessionId)
      .sort((a, b) => a.addedAt - b.addedAt),
    joinRequests: state.joinRequests
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.requestedAt - b.requestedAt),
  }
}
