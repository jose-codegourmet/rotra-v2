import { delay } from '../mock/latency'
import { readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { recordsGames } from '../queue-session/queueSession.types'
import { realGetLiveStandings, realGetSessionMatches } from '../real/match'
import { isRealDataMode } from '../real/mode'
import { exemptionOf } from './exemption.rules'
import { computeStandings } from './match.rules'
export async function getSessionMatches(sessionId: string) {
  if (isRealDataMode()) return realGetSessionMatches(sessionId)
  await delay()
  const state = readMockState()
  sessionIn(state, sessionId)
  return state.matches
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.queuePosition - b.queuePosition)
}
export async function getLiveStandings(sessionId: string) {
  if (isRealDataMode()) return realGetLiveStandings(sessionId)
  await delay()
  const state = readMockState()
  // An unrecorded session has no Leaderboard: no standings, however many games ran.
  if (!recordsGames(sessionIn(state, sessionId))) return []
  return computeStandings(
    state.roster.filter((r) => r.sessionId === sessionId),
    state.matches.filter((m) => m.sessionId === sessionId),
  )
}
/**
 * The session exemption list as roster ids (D-2026-11-19-07). Real mode has no column or Route
 * Handler yet, so it reads as empty and Generate Queue leaves no one out.
 */
export async function getExemptionList(sessionId: string): Promise<string[]> {
  if (isRealDataMode()) return []
  await delay()
  const state = readMockState()
  sessionIn(state, sessionId)
  return exemptionOf(state, sessionId)
}
