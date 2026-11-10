import { closeStaleMatchRequests, namedIn } from '../match-request/matchRequest.rules'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation } from '../mock/transaction'
import { autoFillCourts, autoFillNote } from '../queue-session/courtFill'
import { isRealDataMode } from '../real/mode'
import {
  countedGames,
  FORMAT_LABELS,
  FORMAT_TEAM_SIZES,
  queuedCount,
  shortName,
} from './match.rules'
import type { MatchFormat } from './match.types'
import { append, requireLive } from './queue.mutations'

/**
 * Queue Master decisions on Requests › Match (Q18.12, D-2026-11-09-05). Mock only; real mode
 * refuses truthfully.
 */

const NOT_REAL = 'This request action is not available in real mode yet.'

/** The pill wording a request card reads (“2 v 2”), the prototype's REQ_LABEL. */
const REQUEST_FORMAT_PILL: Record<MatchFormat, string> = {
  doubles: '2 v 2',
  singles: '1 v 1',
  fun_1v2: '1 v 2',
  fun_3v3: '3 v 3',
  fun_4v4: '4 v 4',
  fun_5v5: '5 v 5',
}

/** “2 v 2 doubles”, “1 v 1 singles”, “3 v 3 fun”: the card's “NAME asks for a … match”. */
export const matchRequestFormatLabel = (format: MatchFormat) => {
  const kind = format === 'doubles' || format === 'singles' ? format : 'fun'
  return `${REQUEST_FORMAT_PILL[format]} ${kind}`
}

function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

function openRequest(s: MockState, sessionId: string, requestId: string) {
  // Anyone named who stopped being present closes the request first (it never reopens).
  closeStaleMatchRequests(s, sessionId)
  const r = s.matchRequests.find(
    (x) => x.id === requestId && x.sessionId === sessionId && x.status === 'open',
  )
  if (!r) fail('This match request is already closed.', 'conflict')
  return r
}

const rosterRow = (s: MockState, sessionId: string, id: string) =>
  s.roster.find((r) => r.id === id && r.sessionId === sessionId)

/**
 * **Add to queue**: a waiting match at the end of the Main Queue, protected like a manual match.
 * Named spots stay; every Anyone spot is filled from present players the request does not name,
 * fewest games (played + queued) first, the same rule for every format size. Refused with “Not
 * enough present players to fill this FORMAT match” when the spots can't be filled.
 */
export function addMatchRequestToQueue(input: { sessionId: string; requestId: string }) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  return queueMutation({ area: 'Queue', sessionId: input.sessionId }, (s) => {
    requireLive(s, input.sessionId)
    const r = openRequest(s, input.sessionId, input.requestId)
    const [na, nb] = FORMAT_TEAM_SIZES[r.format]
    const named = new Set(namedIn(r))
    const need = na + nb - named.size
    const matches = s.matches.filter((m) => m.sessionId === input.sessionId)
    const load = (id: string) => countedGames(id, matches) + queuedCount(id, matches)
    const fill = s.roster
      .filter((p) => p.sessionId === input.sessionId && p.present && !named.has(p.id))
      .map((p) => p.id)
      .sort((a, b) => load(a) - load(b))
      .slice(0, need)
    if (fill.length < need)
      fail(
        `Not enough present players to fill this ${FORMAT_LABELS[r.format].toLowerCase()} match`,
        'conflict',
      )
    const teamA = [
      r.pid,
      ...Array.from({ length: na - 1 }, (_, i) => r.partners[i] ?? (fill.shift() as string)),
    ]
    const teamB = Array.from({ length: nb }, (_, i) => r.opponents[i] ?? (fill.shift() as string))
    const match = append(s, input.sessionId, { format: r.format, teamA, teamB }, 'manual', true)
    r.status = 'added'
    r.matchId = match.id
    r.decidedAt = Date.now()
    return {
      data: match,
      text: `Match added to the queue${autoFillNote(s, autoFillCourts(s, input.sessionId))}`,
    }
  })
}

/** **Decline**: the request closes as declined; nothing is queued. */
export function declineMatchRequest(input: { sessionId: string; requestId: string }) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  return queueMutation({ area: 'Queue', sessionId: input.sessionId }, (s) => {
    const r = openRequest(s, input.sessionId, input.requestId)
    r.status = 'declined'
    r.decidedAt = Date.now()
    const row = rosterRow(s, input.sessionId, r.pid)
    return {
      data: null,
      text: `${row ? shortName(row) : 'Player'}'s match request declined`,
    }
  })
}
