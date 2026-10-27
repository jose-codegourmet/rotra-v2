import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
/** Operator data; join-request contacts never enter saved-player or public directory projections. */
export async function getSessionRoster(sessionId: string) {
  await delay()
  const state = readMockState()
  sessionIn(state, sessionId)
  return {
    roster: state.roster
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.confirmedAt - b.confirmedAt),
    waitlist: state.waitlist
      .filter((w) => w.sessionId === sessionId)
      .sort((a, b) => a.addedAt - b.addedAt),
    joinRequests: state.joinRequests
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.requestedAt - b.requestedAt),
  }
}
