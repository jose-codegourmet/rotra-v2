import { FORMAT_TEAM_SIZES, gamesPlayedFor, queuedCount } from '../match/match.rules'
import type { Match, MatchFormat, MatchLineup } from '../match/match.types'
import type { MockState } from '../mock/store'
import {
  prototypeDefaultRequestFormats,
  type QueueSession,
  type RequestFormats,
} from '../queue-session/queueSession.types'
import type { SessionPlayer } from '../session-roster/sessionRoster.types'
import type { MatchRequest } from './matchRequest.types'

/** Toast when the session allows no format (prototype `openMatchReq`). */
export const NO_MATCH_REQUESTS_TEXT = "This session isn't taking match requests"
/** A disabled format pill's tooltip, reused as the refusal for that format. */
export const FORMAT_NOT_ALLOWED_TEXT = 'Not allowed for requests in this session'

/** The six Request a match pills in the prototype's order: 2 v 2 first and default. */
export const REQUEST_FORMAT_ORDER: readonly MatchFormat[] = [
  'doubles',
  'singles',
  'fun_1v2',
  'fun_3v3',
  'fun_4v4',
  'fun_5v5',
]

/** The session's **Players can request** switches, or the prototype default when never set. */
export const requestFormatsOf = (
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles' | 'requestFormats'>,
): RequestFormats => session.requestFormats ?? prototypeDefaultRequestFormats(session)

/** Allowed formats in pill order; empty means the session takes no match requests. */
export const allowedRequestFormats = (
  session: Pick<QueueSession, 'allowSingles' | 'allowDoubles' | 'requestFormats'>,
) => REQUEST_FORMAT_ORDER.filter((format) => requestFormatsOf(session)[format])

/** Spots the format needs besides the requester: N−1 partners and N opponents (1 v 2: 0 and 2). */
export function requestSpots(format: MatchFormat) {
  const [a, b] = FORMAT_TEAM_SIZES[format]
  return { partners: a - 1, opponents: b }
}

/** Everyone a request names: the requester and every picked spot (“Anyone” names no one). */
export const namedIn = (r: Pick<MatchRequest, 'pid' | 'partners' | 'opponents'>) =>
  [r.pid, ...r.partners, ...r.opponents].filter((id): id is string => !!id)

/**
 * A request closes by itself when anyone named stops being present, or is no longer on the roster
 * (D-2026-11-09-05). Mutates the draft; returns how many closed. Run after any presence change: a
 * request closed this way never reopens when the player comes back.
 */
export function closeStaleMatchRequests(state: MockState, sessionId: string, now = Date.now()) {
  const present = new Set(
    state.roster.filter((r) => r.sessionId === sessionId && r.present).map((r) => r.id),
  )
  let closed = 0
  for (const r of state.matchRequests) {
    if (r.sessionId !== sessionId || r.status !== 'open') continue
    if (namedIn(r).every((id) => present.has(id))) continue
    r.status = 'closed'
    r.decidedAt = now
    closed++
  }
  return closed
}

/** True when some open request in the session names a player who is no longer present. */
export function hasStaleMatchRequests(state: MockState, sessionId: string) {
  const present = new Set(
    state.roster.filter((r) => r.sessionId === sessionId && r.present).map((r) => r.id),
  )
  return state.matchRequests.some(
    (r) =>
      r.sessionId === sessionId && r.status === 'open' && namedIn(r).some((id) => !present.has(id)),
  )
}

/**
 * **Add to queue**'s lineup (D-2026-11-09-05): the requester on team A, named spots kept, every
 * Anyone spot filled from present players the request does not name, fewest games (played +
 * queued) first, the same rule for every format size. Null when the present players can't fill
 * the spots. Shared by the mock and the real service, so both pick the same players.
 */
export function requestLineup(
  r: Pick<MatchRequest, 'pid' | 'format' | 'partners' | 'opponents'>,
  ctx: { roster: SessionPlayer[]; matches: Match[] },
): MatchLineup | null {
  const [na, nb] = FORMAT_TEAM_SIZES[r.format]
  const named = new Set(namedIn(r))
  const need = na + nb - named.size
  const load = (id: string) => gamesPlayedFor(id, ctx) + queuedCount(id, ctx.matches)
  const fill = ctx.roster
    .filter((p) => p.present && !named.has(p.id))
    .map((p) => p.id)
    .sort((a, b) => load(a) - load(b))
    .slice(0, need)
  if (fill.length < need) return null
  const teamA = [
    r.pid,
    ...Array.from({ length: na - 1 }, (_, i) => r.partners[i] ?? (fill.shift() as string)),
  ]
  const teamB = Array.from({ length: nb }, (_, i) => r.opponents[i] ?? (fill.shift() as string))
  return { format: r.format, teamA, teamB }
}

/** Add to queue's refusal when the Anyone spots can't be filled. */
export const notEnoughToFillText = (formatLabel: string) =>
  `Not enough present players to fill this ${formatLabel.toLowerCase()} match`
