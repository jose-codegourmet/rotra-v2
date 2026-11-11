import { countedGames, courtNames, holdsCourt } from '../match/match.rules'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { sessionIn } from '../mock/transaction'
import { playerWrite } from '../public-session/playerMutations'
import {
  playerSlot,
  selfCheckInMark,
  sessionTakesRequests,
} from '../public-session/publicSession.rules'
import type { PlayerSessionInput } from '../public-session/publicSession.types'
import {
  allowedRequestFormats,
  closeStaleMatchRequests,
  FORMAT_NOT_ALLOWED_TEXT,
  hasStaleMatchRequests,
  NO_MATCH_REQUESTS_TEXT,
  requestSpots,
} from './matchRequest.rules'
import type {
  MatchRequestSpot,
  SelfCheckInMark,
  SendMatchRequestInput,
  SessionRequests,
} from './matchRequest.types'

function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

/**
 * Persists the auto-close for presence changes made elsewhere (a batch, Mark all absent, removal),
 * like the prototype's `closeStaleMatchReqs`. Writes only when something is stale.
 */
export function sweepStaleMatchRequests(sessionId: string) {
  if (!hasStaleMatchRequests(mockStore.getSnapshot() as MockState, sessionId)) return
  mockStore.update((draft) => {
    closeStaleMatchRequests(draft, sessionId)
  })
}

/**
 * **Send request** (D-2026-11-09-05): a present, confirmed, signed-in Player in a live session.
 * Refused with “This session isn't taking match requests” when the session allows no format, and
 * with the disabled pill's text for a format it does not allow. Spots are fitted to the format
 * (missing ones are Anyone); every named player must be present on the roster, once. One open
 * request per player.
 */
export function sendMatchRequest(slug: string, input: SendMatchRequestInput) {
  return playerWrite(
    slug,
    (s, session) => {
      if (session.state !== 'active') fail('Match requests open when the session starts.')
      const allowed = allowedRequestFormats(session)
      if (!allowed.length) fail(NO_MATCH_REQUESTS_TEXT)
      if (!allowed.includes(input.format)) fail(FORMAT_NOT_ALLOWED_TEXT)
      const row = playerSlot(s, session, input.playerId).roster
      if (!row) fail('Only confirmed players in this session can do this.')
      if (!row.present) fail('Check in first to request a match.')
      closeStaleMatchRequests(s, session.id)
      if (s.matchRequests.some((r) => r.pid === row.id && r.status === 'open'))
        fail('Match request sent · the QM decides', 'conflict')
      const spots = requestSpots(input.format)
      if (input.partners.length > spots.partners || input.opponents.length > spots.opponents)
        fail('Too many players for this format.')
      const fit = (ids: (string | null)[], n: number) =>
        Array.from({ length: n }, (_, i) => ids[i] ?? null)
      const partners = fit(input.partners, spots.partners),
        opponents = fit(input.opponents, spots.opponents)
      const named = [...partners, ...opponents].filter((id): id is string => !!id)
      if (new Set([row.id, ...named]).size !== named.length + 1)
        fail('Pick each player once.', 'conflict')
      const present = new Set(
        s.roster.filter((r) => r.sessionId === session.id && r.present).map((r) => r.id),
      )
      if (named.some((id) => !present.has(id)))
        fail('Present players only. Pick again.', 'conflict')
      const id = crypto.randomUUID()
      s.matchRequests.push({
        id,
        sessionId: session.id,
        pid: row.id,
        format: input.format,
        partners,
        opponents,
        at: Date.now(),
        status: 'open',
        decidedAt: null,
        matchId: null,
      })
      return { matchRequestId: id }
    },
    'Match request sent',
  )
}

/** The player's **Cancel** on their open match request; it becomes `cancelled`. */
export function cancelMatchRequest(slug: string, input: PlayerSessionInput) {
  return playerWrite(
    slug,
    (s, session) => {
      const row = playerSlot(s, session, input.playerId).roster
      const r = row
        ? s.matchRequests.find((x) => x.pid === row.id && x.status === 'open')
        : undefined
      if (!r) fail('This match request is already closed.', 'conflict')
      r.status = 'cancelled'
      r.decidedAt = Date.now()
      return { matchRequestId: r.id }
    },
    'Match request cancelled',
  )
}

/** The QM's Requests read model; see `useSessionRequests` for the shape. */
export function sessionRequests(state: MockState, sessionId: string): SessionRequests {
  const session = sessionIn(state, sessionId)
  const roster = state.roster.filter((r) => r.sessionId === sessionId)
  const byId = new Map(roster.map((r) => [r.id, r]))
  const selfCheckIn: Record<string, SelfCheckInMark> = {}
  for (const r of roster) {
    const mark = selfCheckInMark(r)
    if (mark) selfCheckIn[r.id] = mark
  }
  const empty = { total: 0, join: 0, joinRequests: 0, dropOuts: 0, match: 0 }
  // Finished, invalid and cancelled sessions show no requests (closed, kept on the record).
  if (!sessionTakesRequests(session))
    return {
      sessionId,
      minimum: session.minimumGames,
      counts: empty,
      join: [],
      dropOuts: [],
      match: [],
      selfCheckIn,
    }
  const matches = state.matches.filter((m) => m.sessionId === sessionId)
  const courts = state.courts.filter((c) => c.sessionId === sessionId)
  const waiting = matches
    .filter((m) => m.state === 'waiting')
    .sort((a, b) => a.queuePosition - b.queuePosition)
  const nameOf = (rosterId: string) => byId.get(rosterId)?.nameSnapshot ?? 'Player'
  const spot = (rosterId: string): MatchRequestSpot => {
    const r = byId.get(rosterId)
    const busy = matches.find((m) => holdsCourt(m) && [...m.teamA, ...m.teamB].includes(rosterId))
    const queued = waiting.findIndex((m) => [...m.teamA, ...m.teamB].includes(rosterId))
    return {
      rosterId,
      name: nameOf(rosterId),
      nickname: r?.nicknameSnapshot ?? null,
      level: r?.level ?? null,
      games: countedGames(rosterId, matches),
      where: busy
        ? { kind: 'court', courtLabels: courtNames(busy, courts) }
        : queued >= 0
          ? { kind: 'queue', position: queued + 1 }
          : null,
    }
  }
  const inviteName = (inviteCodeId: string | null | undefined) => {
    const invite = inviteCodeId
      ? state.sessionInviteCodes.find((c) => c.id === inviteCodeId)
      : undefined
    if (!invite) return null
    const slot = playerSlot(state, session, invite.playerId)
    if (slot.roster) return slot.roster.nameSnapshot
    const profile = state.players.find((p) => p.id === invite.playerId)
    return profile?.fullName ?? null
  }
  const join = state.joinRequests
    .filter((r) => r.sessionId === sessionId && r.status === 'pending')
    .sort((a, b) => a.requestedAt - b.requestedAt)
    .map((r) => ({
      ...r,
      account: r.playerId
        ? {
            playerId: r.playerId,
            inClub: state.clubPlayers.some(
              (p) => p.clubId === session.clubId && p.playerId === r.playerId && !p.removedAt,
            ),
          }
        : null,
      invitedByName: inviteName(r.inviteCodeId),
    }))
  const dropOuts = state.dropOutNotices
    .filter((d) => d.sessionId === sessionId && d.status === 'open' && byId.has(d.pid))
    .sort((a, b) => a.at - b.at)
    .map((d) => ({
      ...d,
      name: nameOf(d.pid),
      nickname: byId.get(d.pid)?.nicknameSnapshot ?? null,
    }))
  const present = new Set(roster.filter((r) => r.present).map((r) => r.id))
  const match = state.matchRequests
    .filter(
      (r) =>
        r.sessionId === sessionId &&
        r.status === 'open' &&
        [r.pid, ...r.partners, ...r.opponents].every((id) => !id || present.has(id)),
    )
    .sort((a, b) => a.at - b.at)
    .map((r) => ({
      id: r.id,
      format: r.format,
      at: r.at,
      requester: spot(r.pid),
      partners: r.partners.map((id) => (id ? spot(id) : null)),
      opponents: r.opponents.map((id) => (id ? spot(id) : null)),
    }))
  return {
    sessionId,
    minimum: session.minimumGames,
    counts: {
      total: join.length + dropOuts.length + match.length,
      join: join.length + dropOuts.length,
      joinRequests: join.length,
      dropOuts: dropOuts.length,
      match: match.length,
    },
    join,
    dropOuts,
    match,
    selfCheckIn,
  }
}

/** Q-REQUESTS (QM side): mock only; real mode has no route yet and refuses truthfully. */
export async function getSessionRequests(sessionId: string): Promise<SessionRequests> {
  await delay()
  sweepStaleMatchRequests(sessionId)
  return sessionRequests(readMockState(), sessionId)
}

/**
 * The Requests count alone, for folding into the QM's existing session read: before Start, pending
 * join requests + open drop-out notices (Requests · N); once live, open match requests only (Match
 * requests · N), since join requests close at Start.
 */
export function sessionRequestCount(state: MockState, sessionId: string) {
  const { counts } = sessionRequests(state, sessionId)
  return sessionIn(state, sessionId).state === 'active' ? counts.match : counts.join
}
