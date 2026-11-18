import { queueMasterName } from '../match/match.rules'
import type { MatchFormat } from '../match/match.types'
import type {
  DropOutNoticeView,
  MatchRequestView,
  SendMatchRequestInput,
  SessionRequests,
} from '../match-request/matchRequest.types'
import { playerOrigin } from '../public-session/context'
import type { MatchRequestOptions, PublicMatchPlayer } from '../public-session/publicSession.types'
import { saveToastText } from '../sync/fetchers'
import type { SaveOutcome } from '../sync/sync.types'
import { msOf, realRequest } from './client'
import { autoNote, fillCommand, matchOf, type WireMatch } from './match'
import { accepted } from './queue'

/**
 * Real-mode transport for match requests (D-2026-11-09-05). The Queue Master's Requests read and
 * decisions go to the Queue app's Route Handlers; the signed-in Player's Send request, Cancel and
 * reads are credentialed calls to the Player app on its paired origin (#687), like Request to join.
 * Online only: offline nothing is sent (`realRequest` refuses).
 */

const sessionPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}`

// ---------- Queue Master (Q18.12) ----------

type WireRequestView = Omit<MatchRequestView, 'at'> & { at: string }
type WireDropOutNotice = Omit<DropOutNoticeView, 'at' | 'closedAt'> & {
  at: string
  closedAt: string | null
}
type WireSessionRequests = Omit<SessionRequests, 'match' | 'dropOuts'> & {
  match: WireRequestView[]
  /** Missing on a server from before I can't make it was connected */
  dropOuts?: WireDropOutNotice[]
}

/**
 * Q-REQUESTS: open match requests and the open drop-out notices (I can't make it, D-2026-11-09-03)
 * with ms times; join requests stay on the roster read.
 */
export async function realGetSessionRequests(sessionId: string): Promise<SessionRequests> {
  const wire = await realRequest<WireSessionRequests>(`${sessionPath(sessionId)}/requests`)
  return {
    ...wire,
    match: wire.match.map((m) => ({ ...m, at: msOf(m.at) })),
    dropOuts: (wire.dropOuts ?? []).map((d) => ({
      ...d,
      at: msOf(d.at),
      closedAt: d.closedAt === null ? null : msOf(d.closedAt),
    })),
  }
}

/** Can't make it › **Keep** / **Remove from roster** (D-2026-11-09-03): toast “NAME stays on the roster” / “NAME removed from the roster”. */
async function dropOutDecision(
  input: { sessionId: string; noticeId: string },
  action: 'keep' | 'remove',
) {
  const done = await realRequest<{ noticeId: string; name: string }>(
    `${sessionPath(input.sessionId)}/requests/drop-outs/${encodeURIComponent(input.noticeId)}/${action}`,
    { method: 'POST', body: {} },
  )
  return accepted(
    null,
    action === 'keep' ? `${done.name} stays on the roster` : `${done.name} removed from the roster`,
  )
}
export const realKeepDropOut = (input: { sessionId: string; noticeId: string }) =>
  dropOutDecision(input, 'keep')
export const realRemoveDropOut = (input: { sessionId: string; noticeId: string }) =>
  dropOutDecision(input, 'remove')

/** Add to queue: toast “Match added to the queue”, plus any Auto Queue placement. */
export async function realAddMatchRequestToQueue(input: { sessionId: string; requestId: string }) {
  const { result, autoPlaced } = await fillCommand<WireMatch>(
    input.sessionId,
    `/match-requests/${encodeURIComponent(input.requestId)}/add`,
    { body: {} },
  )
  return accepted(
    matchOf(result),
    `Match added to the queue${await autoNote(input.sessionId, autoPlaced)}`,
  )
}

/** Decline: toast “NAME's match request declined”. */
export async function realDeclineMatchRequest(input: { sessionId: string; requestId: string }) {
  const done = await realRequest<{
    requestId: string
    requester: { nameSnapshot: string; nicknameSnapshot: string | null }
  }>(
    `${sessionPath(input.sessionId)}/match-requests/${encodeURIComponent(input.requestId)}/decline`,
    { method: 'POST', body: {} },
  )
  return accepted(null, `${queueMasterName(done.requester)}'s match request declined`)
}

// ---------- Signed-in Player on the session page (Q17.14), on the Player origin ----------

const playerBase = (slug: string) => {
  const origin = typeof location === 'undefined' ? null : playerOrigin(location.origin)
  if (!origin) throw new Error('Sign in with ROTRA Player to request a match.')
  return `${origin}/api/public-sessions/${encodeURIComponent(slug)}/match-request`
}

const playerWrite = (message: string): SaveOutcome =>
  ({ savedOffline: false, message: saveToastText(message, { savedOffline: false }) }) as const

/** Send request; the request id is fresh per tap, so a retried reply saves one request. */
export async function realSendMatchRequest(slug: string, input: SendMatchRequestInput) {
  const done = await realRequest<{ matchRequestId: string; message: string }>(playerBase(slug), {
    method: 'POST',
    credentials: 'include',
    body: {
      requestId: crypto.randomUUID(),
      format: input.format,
      partners: input.partners,
      opponents: input.opponents,
    },
  })
  return { ...playerWrite(done.message), data: { matchRequestId: done.matchRequestId } }
}

/** Cancel on the Player's own open request. */
export async function realCancelMatchRequest(slug: string) {
  const done = await realRequest<{ matchRequestId: string; message: string }>(
    `${playerBase(slug)}/cancel`,
    { method: 'POST', credentials: 'include', body: {} },
  )
  return { ...playerWrite(done.message), data: { matchRequestId: done.matchRequestId } }
}

/** What Request a match needs, already in the `MatchRequestOptions` shape. */
export function realGetMatchRequestOptions(slug: string) {
  return realRequest<MatchRequestOptions>(`${playerBase(slug)}/options`, {
    credentials: 'include',
  })
}

/** The Player's own open match request (My night), or null. */
export async function realGetMyMatchRequest(slug: string) {
  const { matchRequest } = await realRequest<{
    matchRequest: {
      id: string
      format: MatchFormat
      at: string
      partners: (PublicMatchPlayer | null)[]
      opponents: (PublicMatchPlayer | null)[]
    } | null
  }>(playerBase(slug), { credentials: 'include' })
  return matchRequest && { ...matchRequest, at: msOf(matchRequest.at) }
}
