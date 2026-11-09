import { autoFillPlacements, courtNames, type MatchContext } from '../match/match.rules'
import type { Match } from '../match/match.types'
import { getMockDevState } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { realFillOpenedCourts, realSetCourtFillMode } from '../real/match'
import { isRealDataMode } from '../real/mode'
import type { CourtFillMode } from './queueSession.types'

/**
 * Manual Queue | Auto Queue (Queueing › Auto Queue and Manual Queue). In Auto, free open courts
 * get the next eligible match On court; nothing ever starts by itself. The switch needs internet
 * (owner decision, November 6, 2026), and while the device is offline auto filling pauses: no
 * automatic placements, so two offline devices never auto-place onto the same court and an
 * offline change that syncs later never carries one.
 */

const COURT_FILL_MODES: readonly CourtFillMode[] = ['manual', 'auto']

export const courtFillModeOf = (session: { courtFillMode?: CourtFillMode }) =>
  session.courtFillMode ?? 'manual'

/** Put on court, the mock write: the match holds its court(s), its players are busy, no timer. */
export function putOnCourt(m: Match, courtIds: string[], now = Date.now()) {
  m.state = 'on_court'
  m.courtIds = [...courtIds]
  m.placedAt = now
  m.startedAt = null
}

function fillContext(s: MockState, sessionId: string): MatchContext {
  return {
    roster: s.roster.filter((r) => r.sessionId === sessionId),
    matches: s.matches.filter((m) => m.sessionId === sessionId),
    courts: s.courts.filter((c) => c.sessionId === sessionId && !c.removedAt),
  }
}

/** Auto filling runs only for a running session in Auto Queue, and never while offline. */
function autoFillOn(s: MockState, sessionId: string) {
  const session = s.sessions.find((x) => x.id === sessionId)
  return (
    !!session &&
    session.state === 'active' &&
    courtFillModeOf(session) === 'auto' &&
    !getMockDevState().offline
  )
}

/**
 * Auto Queue inside the triggering mock write (same draft, same sync entry): places the next
 * eligible match on each free open court (or only `onlyCourtIds`), skipping 5v5, courts not open
 * yet and `exceptMatchId`. Returns the placed matches; none in Manual Queue or offline.
 */
export function autoFillCourts(
  s: MockState,
  sessionId: string,
  options: {
    exceptMatchId?: string
    onlyCourtIds?: readonly string[]
    exceptCourtIds?: readonly string[]
  } = {},
): Match[] {
  if (!autoFillOn(s, sessionId)) return []
  const now = Date.now()
  return autoFillPlacements({ ...fillContext(s, sessionId), now }, options).flatMap((p) => {
    const m = s.matches.find((x) => x.id === p.matchId)
    if (!m) return []
    putOnCourt(m, [p.courtId], now)
    return [m]
  })
}

/** The toast tail for automatic placements: " · Match 5 on Court 2 · getting ready". */
export const autoFillNote = (s: Pick<MockState, 'courts'>, placed: Match[]) =>
  placed.map((m) => ` · Match ${m.matchNo} on ${courtNames(m, s.courts)} · getting ready`).join('')

/**
 * The Manual Queue | Auto Queue switch, any time while the session runs. Turning Auto on fills
 * every free open court now, in court order; turning it off leaves On court matches where they
 * are. Needs internet: refused offline, never queued for sync.
 */
export function setCourtFillMode(input: { sessionId: string; mode: CourtFillMode }) {
  if (isRealDataMode()) return realSetCourtFillMode(input)
  return queueMutation(
    { area: 'Courts and time', onlineOnly: true, sessionId: input.sessionId },
    (s) => {
      const session = sessionIn(s, input.sessionId)
      if (session.state !== 'active') throw new MockError('permission', 'Start the session first.')
      if (!COURT_FILL_MODES.includes(input.mode))
        throw new MockError('permission', 'Choose Manual Queue or Auto Queue.')
      const was = courtFillModeOf(session)
      session.courtFillMode = input.mode
      if (input.mode === 'manual')
        return {
          data: null,
          text:
            was === 'manual'
              ? 'Manual Queue on'
              : 'Manual Queue on · matches already on court stay where they are',
        }
      return {
        data: null,
        text: `Auto Queue on${autoFillNote(s, autoFillCourts(s, session.id))}`,
      }
    },
  )
}

/** The fill toast: "Court open · Match 5 on Court 2 · getting ready", or just the placement after Skip for now. */
export const courtFillText = (note: string, afterSkip?: boolean) =>
  afterSkip ? note.replace(/^ · /, '') : `Court open${note}`

/**
 * Auto Queue when courts reach their planned opening time (the console notices on its refresh,
 * as the prototype does every 30 seconds). Fills only `courtIds`, and only in Auto Queue while
 * online; with nothing to place it writes nothing. `data` is the number of matches placed.
 * `afterSkip`: Skip for now on the next-match picker (Q-NEXT-MATCH) hands the court it held back
 * to Auto Queue; the toast is then just "Match 5 on Court 2 · getting ready".
 */
export function fillOpenedCourts(input: {
  sessionId: string
  courtIds: string[]
  afterSkip?: boolean
}) {
  if (isRealDataMode()) return realFillOpenedCourts(input)
  const current = readMockState()
  const none =
    !input.courtIds.length ||
    !autoFillOn(current, input.sessionId) ||
    !autoFillPlacements(fillContext(current, input.sessionId), { onlyCourtIds: input.courtIds })
      .length
  if (none) return Promise.resolve({ savedOffline: false, message: '', data: 0 })
  return queueMutation({ area: 'Queue', sessionId: input.sessionId }, (s) => {
    const placed = autoFillCourts(s, input.sessionId, { onlyCourtIds: input.courtIds })
    return { data: placed.length, text: courtFillText(autoFillNote(s, placed), input.afterSkip) }
  })
}
