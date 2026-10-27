import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { computeStandings } from './match.rules'
export async function getSessionMatches(sessionId: string) {
  await delay()
  const state = readMockState()
  sessionIn(state, sessionId)
  return state.matches
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.queuePosition - b.queuePosition)
}
export async function getLiveStandings(sessionId: string) {
  await delay()
  const state = readMockState()
  sessionIn(state, sessionId)
  return computeStandings(
    state.roster.filter((r) => r.sessionId === sessionId),
    state.matches.filter((m) => m.sessionId === sessionId),
  )
}
