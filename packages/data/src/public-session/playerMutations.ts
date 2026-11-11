import { getConnectivity } from '../connectivity/connectivity'
import { closeStaleMatchRequests } from '../match-request/matchRequest.rules'
import { requireOnline } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { type MockState, mockStore, readMockState } from '../mock/store'
import { isRealDataMode } from '../real/mode'
import {
  realCancelMyJoinRequest,
  realJoinAsPlayer,
  realMoveMeToWaitlist,
} from '../real/public-session'
import {
  JOIN_REQUESTS_STARTED_ERROR,
  SLOTS_FULL_ERROR,
  settleRoster,
  slotsFull,
  stepDownChange,
} from '../session-roster/mutations'
import { SELF_STEP_DOWN_BLOCKED } from '../session-roster/sessionRoster.rules'
import type { SaveOutcome } from '../sync/sync.types'
import { makeInviteCode, playerSlot } from './publicSession.rules'
import type { JoinAsPlayerInput, PlayerSessionInput } from './publicSession.types'

/**
 * Player-side writes from a signed-in ROTRA Player on the session page (Q17.2, mock only). They go
 * straight to the server, never through the club device's sync log, so the Queue Master sees them
 * with their next refresh. Real mode has no route yet for the others: `delay` refuses with NotConnectedError; Request to
 * join and Cancel request go to the Player app (#687).
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
  // Real mode (#687): the Player app knows who is signed in; no playerId or invite code is sent.
  if (isRealDataMode()) return realJoinAsPlayer(slug, input.placement ?? 'slot')
  const placement = input.placement ?? 'slot'
  return playerWrite(
    slug,
    (s, session) => {
      requireOnline()
      if (session.state === 'active') fail(JOIN_REQUESTS_STARTED_ERROR)
      if (!session.acceptJoinRequests || session.state !== 'prepared')
        fail('Join requests are off.')
      const player = s.players.find((p) => p.id === input.playerId)
      if (!player) fail('Sign in with ROTRA Player to send a request.')
      const slot = playerSlot(s, session, input.playerId)
      if (
        s.joinRequests.some(
          (r) =>
            r.sessionId === session.id && r.playerId === input.playerId && r.status === 'pending',
        )
      )
        fail('Your request is already sent.', 'conflict')
      // D-2026-11-11-02: Join from waitlist. Only a waitlisted Player, only while a slot is open;
      // the Queue Master still confirms (Give slot / Admit player).
      if (placement === 'from_waitlist') {
        if (slot.roster) fail("You're already in this session.", 'conflict')
        if (!slot.waitlist) fail('Only waitlisted players can ask to join from the waitlist.')
        if (slotsFull(s, session.id))
          fail('All slots are taken. You keep your place on the waitlist.', 'conflict')
        const band = slot.waitlist.level?.split('_')[0]
        const id = crypto.randomUUID()
        s.joinRequests.push({
          id,
          sessionId: session.id,
          name: player.fullName,
          nickname: player.nickname,
          phoneE164: null,
          statedBand:
            band === 'beginner' || band === 'intermediate' || band === 'advanced' ? band : 'unsure',
          placement: 'from_waitlist',
          status: 'pending',
          requestedAt: Date.now(),
          decidedAt: null,
          clubPlayerId: slot.waitlist.clubPlayerId,
          playerId: input.playerId,
          inviteCodeId: null,
        })
        return { requestId: id }
      }
      if (slot.roster || slot.waitlist) fail("You're already in this session.", 'conflict')
      // D-2026-11-11-02: players cannot join a slot while every slot is taken; the waitlist remains.
      if (placement === 'slot' && slotsFull(s, session.id)) fail(SLOTS_FULL_ERROR, 'conflict')
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
        placement,
        status: 'pending',
        requestedAt: Date.now(),
        decidedAt: null,
        clubPlayerId: null,
        playerId: input.playerId,
        inviteCodeId: invite && invite.playerId !== input.playerId ? invite.id : null,
      })
      return { requestId: id }
    },
    placement === 'from_waitlist' ? 'Slot requested' : 'Request sent',
  )
}

/** **Cancel request** while the account's request is still pending; it becomes `cancelled`. */
export function cancelMyJoinRequest(slug: string, input: PlayerSessionInput) {
  if (isRealDataMode()) return realCancelMyJoinRequest(slug)
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
      if (s.clubs.find((c) => c.id === session.clubId)?.selfCheckInEnabled === false)
        fail('Your club has turned self check-in off.')
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
      getConnectivity() === 'offline'
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
 * **Move me to the waitlist** (#735): the signed-in confirmed Player steps down to the front of the
 * waitlist, before the start or during play. The card hides the button while they are in a match;
 * the server still refuses then (“You're in a match. Ask the Queue Master to finish or remove it
 * first.”). Their level and paid mark stay and come back with a slot.
 */
export function moveMeToWaitlist(slug: string, input: PlayerSessionInput) {
  // Real mode (#735): the Player app knows who is signed in. Before playerWrite, whose mock delay
  // refuses in real mode.
  if (isRealDataMode()) return realMoveMeToWaitlist(slug)
  return playerWrite(
    slug,
    (s, session) => {
      if (session.state !== 'prepared' && session.state !== 'active')
        fail('This session has finished.')
      const row = requireRosterRow(s, session, input.playerId)
      stepDownChange(s, { sessionId: session.id, rosterId: row.id }, SELF_STEP_DOWN_BLOCKED)
      settleRoster(s, session.id, null)
      return { clubPlayerId: row.clubPlayerId }
    },
    'You moved to the waitlist',
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
