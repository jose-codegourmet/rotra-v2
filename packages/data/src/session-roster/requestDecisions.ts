import { flushSessionBatches } from '../batch/flushBatches'
import type { ClubPlayer } from '../club-player/clubPlayer.types'
import { createClubPlayer } from '../club-player/mutations'
import { leaderboardLevels } from '../fixtures/players'
import { closeStaleMatchRequests } from '../match-request/matchRequest.rules'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, readMockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import type { PlayingLevel } from '../player/player.types'
import { promoteWaiter, recomputeMinimum } from '../queue-session/mutations'
import { isRealDataMode } from '../real/mode'
import {
  capacity,
  confirmJoinRequest,
  confirmJoinRequestChange,
  place,
  slotsFull,
} from './mutations'
import { levelLabel } from './sessionRoster.rules'
import type { SessionJoinRequest } from './sessionRoster.types'

/**
 * Queue Master decisions on Requests › Join (Q18.12) that the original join-request commands do not
 * cover: confirming a signed-in ROTRA player's request or a linked guest request, the phone-match
 * Link / Not them prompt (D-2026-11-09-06), and the drop-out notices' Remove from roster / Keep
 * (D-2026-11-09-03). Mock only; real mode refuses truthfully.
 */

const NOT_REAL = 'This request action is not available in real mode yet.'

function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

async function requestMutation<T>(
  sessionId: string,
  change: (s: MockState) => { data: T; text: string },
) {
  await flushSessionBatches(sessionId)
  return queueMutation({ area: 'Roster', sessionId }, (s) => {
    const result = change(s)
    recomputeMinimum(s, sessionId)
    // D-2026-11-09-05: a match request closes when anyone it names stops being present.
    closeStaleMatchRequests(s, sessionId)
    return result
  })
}

function pendingRequest(s: MockState, requestId: string) {
  const r = s.joinRequests.find((x) => x.id === requestId)
  if (!r || r.status !== 'pending') fail('This join request has already been decided.', 'conflict')
  return r
}

const savedPlayer = (s: MockState, clubId: string, id: string | null | undefined) =>
  id
    ? s.clubPlayers.find(
        (p) => p.id === id && p.clubId === clubId && !p.removedAt && !p.linkedToClubPlayerId,
      )
    : undefined

/**
 * The server's phone suggestion for a guest request (D-2026-11-09-06): a saved player of the club
 * who is not registered and whose private phone is the request's phone. Never for an account
 * request, an already linked one, or after Not them.
 */
export function phoneSuggestion(s: MockState, r: SessionJoinRequest): ClubPlayer | null {
  if (r.playerId || r.linkedClubPlayerId || r.linkDeclinedAt || !r.phoneE164) return null
  const clubId = sessionIn(s, r.sessionId).clubId
  return (
    s.clubPlayers.find(
      (p) =>
        p.clubId === clubId &&
        !p.removedAt &&
        !p.linkedToClubPlayerId &&
        p.identity !== 'registered' &&
        s.privatePhones[p.id] === r.phoneE164,
    ) ?? null
  )
}

export type JoinRequestHint = {
  /** A signed-in Player's shared rank (“Shared rank: …”); null reads “none yet” */
  sharedRank: PlayingLevel | null
  /** “Is this NAME from your saved players?” */
  phoneMatch: { clubPlayerId: string; name: string } | null
  /** “Linked to NAME from your saved players.” */
  linked: { clubPlayerId: string; name: string } | null
}

/**
 * Per pending join request: the shared-rank hint, the phone-match suggestion and the linked saved
 * player. Keyed by request id; mock only (real mode returns no hints).
 */
export async function getJoinRequestHints(
  sessionId: string,
): Promise<Record<string, JoinRequestHint>> {
  if (isRealDataMode()) return {}
  await delay()
  const s = readMockState()
  const session = sessionIn(s, sessionId)
  const hints: Record<string, JoinRequestHint> = {}
  for (const r of s.joinRequests) {
    if (r.sessionId !== sessionId || r.status !== 'pending') continue
    const linked = savedPlayer(s, session.clubId, r.linkedClubPlayerId)
    const match = phoneSuggestion(s, r)
    hints[r.id] = {
      sharedRank: r.playerId ? (leaderboardLevels[r.playerId] ?? null) : null,
      phoneMatch: match ? { clubPlayerId: match.id, name: match.fullName } : null,
      linked: linked ? { clubPlayerId: linked.id, name: linked.fullName } : null,
    }
  }
  return hints
}

/** **Link** on the phone-match prompt: confirming the request then gives that saved player the slot. */
export function linkJoinRequest(input: { requestId: string; clubPlayerId: string }) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  const r = pendingRequest(readMockState(), input.requestId)
  return requestMutation(r.sessionId, (s) => {
    const request = pendingRequest(s, input.requestId)
    const match = phoneSuggestion(s, request)
    if (!match || match.id !== input.clubPlayerId) fail('Player not available.', 'conflict')
    request.linkedClubPlayerId = match.id
    return { data: { clubPlayerId: match.id }, text: `Linked to ${match.fullName}` }
  })
}

/** **Not them**: hides the phone-match prompt for this request. */
export function dismissJoinRequestLink(requestId: string) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  const r = pendingRequest(readMockState(), requestId)
  return requestMutation(r.sessionId, (s) => {
    const request = pendingRequest(s, requestId)
    request.linkDeclinedAt = Date.now()
    return { data: null, text: `${request.name} is not a saved player` }
  })
}

/** The saved player for a signed-in Player's request, created (registered) when new to the club. */
function accountPlayer(s: MockState, clubId: string, r: SessionJoinRequest): ClubPlayer {
  const playerId = r.playerId as string
  const saved = s.clubPlayers.find(
    (p) => p.clubId === clubId && p.playerId === playerId && !p.removedAt,
  )
  if (saved) return saved
  const profile = s.players.find((p) => p.id === playerId)
  const player: ClubPlayer = {
    id: crypto.randomUUID(),
    clubId,
    playerId,
    fullName: profile?.fullName ?? r.name,
    nickname: profile?.nickname ?? r.nickname,
    identity: 'registered',
    playingLevel: null,
    addedAt: Date.now(),
    // D-2026-11-09-06: a player new to the club is saved as “Joined via session link”.
    joinedVia: 'session',
  }
  s.clubPlayers.push(player)
  return player
}

/**
 * **Confirm** / **Confirm guest** / **Confirm to waitlist** with the level the QM chose. A guest
 * request goes through `confirmJoinRequest` (a new guest record); a linked guest request gives the
 * linked saved player the slot; a signed-in Player's request uses their saved player, saving a
 * player new to the club as registered and “Joined via session link”.
 */
export function confirmRequest(input: { requestId: string; level: PlayingLevel }) {
  const r = isRealDataMode() ? null : pendingRequest(readMockState(), input.requestId)
  if (!r || (!r.playerId && !r.linkedClubPlayerId)) return confirmJoinRequest(input)
  return requestMutation(r.sessionId, (s) => confirmRequestChange(s, input))
}

/**
 * The mock write behind Confirm for every kind of join request, chosen from the request as saved
 * now: a guest's, a linked guest's, a signed-in Player's, or a Join from waitlist. The roster
 * batch (#718) applies it in click order with the other roster changes of one burst.
 */
export function confirmRequestChange(
  s: MockState,
  input: { requestId: string; level: PlayingLevel },
) {
  const r = pendingRequest(s, input.requestId)
  if (!r.playerId && !r.linkedClubPlayerId) return confirmJoinRequestChange(s, input)
  if (r.placement === 'from_waitlist') return giveSlotFromRequestChange(s, input)
  const request = pendingRequest(s, input.requestId)
  const clubId = sessionIn(s, request.sessionId).clubId
  const p = request.playerId
    ? accountPlayer(s, clubId, request)
    : savedPlayer(s, clubId, request.linkedClubPlayerId)
  if (!p) fail('Player not available.', 'conflict')
  const data = place(
    s,
    request.sessionId,
    p,
    input.level,
    request.requestedAt,
    request.placement === 'waitlist',
  )
  request.status = 'confirmed'
  request.decidedAt = Date.now()
  request.clubPlayerId = p.id
  return {
    data,
    text: `${p.fullName} confirmed from a join request · ${data.waitlistPosition ? `waitlist #${data.waitlistPosition}` : levelLabel(input.level)}`,
  }
}

/**
 * **Give slot** / **Admit player** on a Join from waitlist request (D-2026-11-11-02): promotes the
 * Player's own waitlist entry with the level the QM chose. Before start it never overfills: full
 * again means a refusal and the player keeps their place. During play the QM may admit above the
 * budget, as with Admit player. A player no longer on the waitlist is refused; the QM declines it.
 */
function giveSlotFromRequestChange(
  s: MockState,
  input: { requestId: string; level: PlayingLevel },
) {
  const request = pendingRequest(s, input.requestId)
  const session = sessionIn(s, request.sessionId)
  const entry = s.waitlist.find(
    (w) => w.sessionId === session.id && w.clubPlayerId === request.clubPlayerId,
  )
  // Removed from the waitlist meanwhile: the QM declines the request (no partial write here).
  if (!entry) fail(`${request.name} is no longer on the waitlist.`, 'conflict')
  if (session.state !== 'active' && slotsFull(s, session.id))
    fail(`Slots are full again. ${request.name} stays on the waitlist.`, 'conflict')
  entry.level = input.level
  promoteWaiter(s, entry)
  request.status = 'confirmed'
  request.decidedAt = Date.now()
  const n = s.roster.filter((x) => x.sessionId === session.id).length
  return {
    data: {
      waitlistPosition: 0,
      locked: session.state === 'active',
      clubPlayerId: entry.clubPlayerId,
    },
    text: `${request.name} got a slot from the waitlist · ${levelLabel(input.level)}${session.state === 'active' && n > capacity(s, session.id) ? ` · now ${n} players for ${capacity(s, session.id)} slots` : ''}`,
  }
}

function openNotice(s: MockState, sessionId: string, noticeId: string) {
  const d = s.dropOutNotices.find(
    (x) => x.id === noticeId && x.sessionId === sessionId && x.status === 'open',
  )
  if (!d) fail('This notice is already closed.', 'conflict')
  const row = s.roster.find((r) => r.id === d.pid && r.sessionId === sessionId)
  if (!row) fail('Player not available.', 'conflict')
  return { d, row }
}

/** **Keep**: closes the drop-out notice; the player stays on the roster. */
export function keepDropOut(input: { sessionId: string; noticeId: string }) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  return requestMutation(input.sessionId, (s) => {
    const { d, row } = openNotice(s, input.sessionId, input.noticeId)
    d.status = 'closed'
    d.decision = 'kept'
    d.closedAt = Date.now()
    return { data: null, text: `${row.nameSnapshot} stays on the roster` }
  })
}

/**
 * **Remove from roster**: closes the notice and releases the slot in one write, in a prepared or a
 * live session. As in the prototype's `removeDropOut`, only the roster row goes: matches that name
 * the player are left as they are, and match requests naming them close (they stopped being present).
 */
export function removeDropOut(input: { sessionId: string; noticeId: string }) {
  if (isRealDataMode()) throw new MockError('permission', NOT_REAL)
  return requestMutation(input.sessionId, (s) => {
    const { d, row } = openNotice(s, input.sessionId, input.noticeId)
    d.status = 'closed'
    d.decision = 'removed'
    d.closedAt = Date.now()
    s.roster = s.roster.filter((r) => r.id !== row.id)
    return { data: null, text: `${row.nameSnapshot} removed from the roster` }
  })
}
