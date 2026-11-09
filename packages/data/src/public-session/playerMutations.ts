import { closeStaleMatchRequests } from '../match-request/matchRequest.rules'
import { getMockDevState, requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import type { SaveOutcome } from '../sync/sync.types'
import { makeInviteCode, playerSlot } from './publicSession.rules'
import type { JoinAsPlayerInput, PlayerSessionInput } from './publicSession.types'

/**
 * Player-side writes from a signed-in ROTRA Player on the session page (Q17.2, mock only). They go
 * straight to the server, never through the club device's sync log, so the Queue Master sees them
 * with their next refresh. Real mode has no route yet: `delay` refuses with NotConnectedError.
 * Identity (`playerId`) comes from the Player session; the server checks the roster link.
 */
function fail(text: string, kind: 'permission' | 'conflict' = 'permission'): never {
  throw new MockError(kind, text)
}

function sessionBySlug(state: MockState, slug: string) {
  const session = state.sessions.find((s) => s.publicSlug === slug)
  if (!session) fail("This session page isn't available.")
  return session
}

/** One atomic store write after the mock delay; a thrown refusal leaves the store unchanged. */
export async function playerWrite<T>(
  slug: string,
  change: (state: MockState, session: MockState['sessions'][number]) => T,
  message: string | ((data: T) => string),
): Promise<SaveOutcome & { data: T }> {
  await delay()
  const out: { result?: { data: T } } = {}
  mockStore.update((draft) => {
    out.result = { data: change(draft, sessionBySlug(draft, slug)) }
  })
  if (!out.result) throw new Error('Player write produced no result.')
  const { data } = out.result
  return {
    savedOffline: false,
    message: typeof message === 'string' ? message : message(data),
    data,
  }
}

function requireRosterRow(state: MockState, session: MockState['sessions'][number], id: string) {
  const row = playerSlot(state, session, id).roster
  if (!row) fail('Only confirmed players in this session can do this.')
  return row
}

/**
 * **Request to join as NAME** (D-2026-11-09-02): one tap, no form; the request carries the account.
 * Refused when requests are off or the session has finished, when the Player already has a slot or
 * a waitlist place, or while their earlier request is still pending (one open per account). An
 * `inviteCode` from `?invite=` that belongs to this session becomes “Invited by NAME”.
 */
export function joinAsPlayer(slug: string, input: JoinAsPlayerInput) {
  return playerWrite(
    slug,
    (s, session) => {
      requireOnline()
      if (
        !session.acceptJoinRequests ||
        (session.state !== 'prepared' && session.state !== 'active')
      )
        fail('Join requests are off.')
      const player = s.players.find((p) => p.id === input.playerId)
      if (!player) fail('Sign in with ROTRA Player to send a request.')
      const slot = playerSlot(s, session, input.playerId)
      if (slot.roster || slot.waitlist) fail("You're already in this session.", 'conflict')
      if (
        s.joinRequests.some(
          (r) =>
            r.sessionId === session.id && r.playerId === input.playerId && r.status === 'pending',
        )
      )
        fail('Your request is already sent.', 'conflict')
      const invite = input.inviteCode
        ? s.sessionInviteCodes.find(
            (c) => c.sessionId === session.id && c.code === input.inviteCode,
          )
        : undefined
      const level = s.clubPlayers.find(
        (p) => p.clubId === session.clubId && p.playerId === input.playerId,
      )?.playingLevel
      const band = level?.split('_')[0]
      const id = crypto.randomUUID()
      s.joinRequests.push({
        id,
        sessionId: session.id,
        name: player.fullName,
        nickname: player.nickname,
        phoneE164: null,
        statedBand:
          band === 'beginner' || band === 'intermediate' || band === 'advanced' ? band : 'unsure',
        status: 'pending',
        requestedAt: Date.now(),
        decidedAt: null,
        clubPlayerId: null,
        playerId: input.playerId,
        inviteCodeId: invite && invite.playerId !== input.playerId ? invite.id : null,
      })
      return { requestId: id }
    },
    'Request sent',
  )
}

/** **Cancel request** while the account's request is still pending; it becomes `cancelled`. */
export function cancelMyJoinRequest(slug: string, input: PlayerSessionInput) {
  return playerWrite(
    slug,
    (s, session) => {
      requireOnline()
      const r = s.joinRequests.find(
        (x) =>
          x.sessionId === session.id && x.playerId === input.playerId && x.status === 'pending',
      )
      if (!r) fail('This join request has already been decided.', 'conflict')
      r.status = 'cancelled'
      r.decidedAt = Date.now()
      return { requestId: r.id }
    },
    'Request cancelled',
  )
}

/**
 * **I'm here** (D-2026-11-09-03), live sessions only: sets Present with the “checked in themselves”
 * mark. A check-in after the QM turned Present off is a new check-in with a new mark. While the
 * club device is offline (DevMenu) the toast says the QM sees it after their next sync.
 */
export function selfCheckIn(slug: string, input: PlayerSessionInput) {
  return playerWrite(
    slug,
    (s, session) => {
      if (session.state !== 'active') fail('Check-in opens when the session starts.')
      const row = requireRosterRow(s, session, input.playerId)
      if (row.present) fail("You're already marked present.", 'conflict')
      const now = Date.now()
      row.present = true
      row.presentChangedAt = now
      row.selfCheckedInAt = now
      row.leftAt = null
      return { rosterId: row.id }
    },
    () =>
      getMockDevState().offline
        ? 'Checked in · the QM will see it when their device syncs'
        : 'Checked in',
  )
}

/**
 * **I'm leaving**: turns Present off, marks “Left”, and closes the player's open match request
 * plus any other open request that names them. Never releases the slot.
 */
export function leaveSession(slug: string, input: PlayerSessionInput) {
  return playerWrite(
    slug,
    (s, session) => {
      if (session.state !== 'active') fail('Only a live session can be left.')
      const row = requireRosterRow(s, session, input.playerId)
      if (!row.present) fail("You're not marked present.", 'conflict')
      const now = Date.now()
      row.present = false
      row.presentChangedAt = now
      row.leftAt = now
      closeStaleMatchRequests(s, session.id, now)
      return { rosterId: row.id }
    },
    "Told the QM you're leaving",
  )
}

/**
 * **I can't make it**: a confirmed Player, before the start, sends a drop-out notice. The slot stays
 * until the QM acts. One open notice per player.
 */
export function sendDropOutNotice(slug: string, input: PlayerSessionInput) {
  return playerWrite(
    slug,
    (s, session) => {
      if (session.state !== 'prepared') fail('The session has already started.')
      const row = requireRosterRow(s, session, input.playerId)
      if (s.dropOutNotices.some((d) => d.pid === row.id && d.status === 'open'))
        fail("Told the QM you can't make it", 'conflict')
      const id = crypto.randomUUID()
      s.dropOutNotices.push({
        id,
        sessionId: session.id,
        pid: row.id,
        playerId: input.playerId,
        at: Date.now(),
        status: 'open',
        decision: null,
        closedAt: null,
      })
      return { noticeId: id }
    },
    "Told the QM you can't make it",
  )
}

/**
 * Session invite (D-2026-11-09-08): this Player's code for this session, made the first time and
 * the same code every time after. Only a confirmed or waitlisted Player, and only while the session
 * is Prepared (refused once it is live, finished or cancelled).
 */
export async function getSessionInviteCode(slug: string, input: PlayerSessionInput) {
  const check = (s: MockState, session: MockState['sessions'][number]) => {
    if (session.state !== 'prepared') fail('Invites close when the session starts.')
    const slot = playerSlot(s, session, input.playerId)
    if (!slot.roster && !slot.waitlist) fail('Only confirmed or waitlisted players can invite.')
    return s.sessionInviteCodes.find(
      (c) => c.sessionId === session.id && c.playerId === input.playerId,
    )
  }
  await delay()
  const snapshot = readMockState()
  const saved = check(snapshot, sessionBySlug(snapshot, slug))
  if (saved) return { code: saved.code }
  let code = ''
  mockStore.update((s) => {
    const session = sessionBySlug(s, slug)
    // Re-checked inside the write: a code made meanwhile is reused, never replaced.
    const again = check(s, session)
    if (again) {
      code = again.code
      return
    }
    code = makeInviteCode(new Set(s.sessionInviteCodes.map((c) => c.code)))
    s.sessionInviteCodes.push({
      id: crypto.randomUUID(),
      sessionId: session.id,
      playerId: input.playerId,
      code,
      createdAt: Date.now(),
    })
  })
  return { code }
}
