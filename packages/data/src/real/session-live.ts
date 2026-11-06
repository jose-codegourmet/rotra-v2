import type { PlayingLevel } from '../player/player.types'
import { atWhenLabel } from '../queue-session/queueSession.rules'
import type { QueueSessionInput, SessionCourt } from '../queue-session/queueSession.types'
import { levelLabel } from '../session-roster/sessionRoster.rules'
import { realRequest } from './client'
import { accepted, realGetQueueSession } from './queue'

/**
 * Real mode for the rest of a Queue Session's life: start, edit preparation, courts and time,
 * presence, waitlist and join requests. Every call is online and counts as saved only when its
 * Route Handler accepted it.
 */

const sessionPath = (sessionId: string) => `/api/sessions/${encodeURIComponent(sessionId)}`
const iso = (ms: number) => new Date(ms).toISOString()
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

type WireSessionRead = { session: { revision: string; title: string; scheduledEndAt: string } }
type WireSession = { revision: string; title: string; scheduledEndAt: string }

/** The session as saved now; commands that need a revision send this one. */
const readSession = async (sessionId: string) =>
  (await realRequest<WireSessionRead>(sessionPath(sessionId))).session

// ---------- Session (Q-PREPARE) ----------

/** Start session; `newEndAt` is the required new end of a late or other-day start (T3). */
export async function realStartSession(input: { sessionId: string; newEndAt?: number | null }) {
  const { sessionId, newEndAt = null } = input
  const { revision } = await readSession(sessionId)
  const session = await realRequest<WireSession>(`${sessionPath(sessionId)}/start`, {
    method: 'POST',
    body: { expectedRevision: revision, newEndAt: newEndAt == null ? null : iso(newEndAt) },
    fields: { roster: 'roster', session: 'session' },
  })
  // The service saves the new end only on a late or other-day start.
  const endAt = Date.parse(session.scheduledEndAt)
  const ends =
    newEndAt != null && endAt === newEndAt ? ` · ends ${atWhenLabel(endAt, Date.now())}` : ''
  return accepted(await realGetQueueSession(sessionId), `Session started · levels locked${ends}`)
}

export async function realUpdateQueueSession(input: {
  sessionId: string
  values: QueueSessionInput
}) {
  const { revision } = await readSession(input.sessionId)
  const { values } = input
  await realRequest<WireSession>(sessionPath(input.sessionId), {
    method: 'PATCH',
    body: {
      commandId: crypto.randomUUID(),
      expectedRevision: revision,
      input: {
        ...values,
        scheduledStartAt: iso(values.scheduledStartAt),
        scheduledEndAt: iso(values.scheduledEndAt),
        courts: values.courts.map((court) => ({
          label: court.label,
          startsAt: court.startsAt == null ? null : iso(court.startsAt),
          openUntil: court.openUntil == null ? null : iso(court.openUntil),
        })),
      },
    },
    fields: { session: 'title' },
  })
  return accepted(await realGetQueueSession(input.sessionId), 'Preparation saved')
}

export async function realDeleteSession(sessionId: string) {
  const { id, title } = await realRequest<{ id: string; title: string }>(sessionPath(sessionId), {
    method: 'DELETE',
    fields: { roster: 'roster', state: 'state' },
  })
  return accepted({ id }, `Session deleted · ${title}`)
}

/** D-CANCEL-SESSION: online only, like Delete session; a retry returns the cancelled session. */
export async function realCancelSession(input: { sessionId: string; reason?: string | null }) {
  const { title } = await realRequest<WireSession>(`${sessionPath(input.sessionId)}/cancel`, {
    method: 'POST',
    body: { reason: input.reason?.trim() || null },
    fields: { reason: 'reason', state: 'state' },
  })
  return accepted(await realGetQueueSession(input.sessionId), `${title} cancelled`)
}

export async function realSetAcceptJoinRequests(input: { sessionId: string; accept: boolean }) {
  await realRequest<WireSession>(sessionPath(input.sessionId), {
    method: 'PATCH',
    body: { acceptJoinRequests: input.accept },
  })
  return accepted(null, `Join requests are ${input.accept ? 'on' : 'off'}`)
}

// ---------- Courts and time ----------

type WireCourt = {
  id: string
  sessionId: string
  label: string
  /** Null for older courts: the session start applies. */
  startsAt: string | null
  openedEarlyAt: string | null
  openUntil: string | null
  removedAt: string | null
}

const courtPath = (sessionId: string, courtId: string) =>
  `${sessionPath(sessionId)}/courts/${encodeURIComponent(courtId)}`

const courtOf = (court: WireCourt): SessionCourt => ({
  id: court.id,
  sessionId: court.sessionId,
  label: court.label,
  startsAt: court.startsAt ? Date.parse(court.startsAt) : undefined,
  openedEarlyAt: court.openedEarlyAt ? Date.parse(court.openedEarlyAt) : null,
  openUntil: court.openUntil ? Date.parse(court.openUntil) : null,
  removedAt: court.removedAt ? Date.parse(court.removedAt) : null,
})

/** The planned start as the service saves it: the session start applies when none is set. */
const planned = (court: WireCourt) => (court.startsAt ? hhmm(court.startsAt) : 'at session start')

export async function realAddCourt(input: {
  sessionId: string
  label: string
  startsAt?: number
  openUntil: number | null
}) {
  const path = `${sessionPath(input.sessionId)}/courts`
  const { court } = await realRequest<{ court: WireCourt }>(path, {
    method: 'POST',
    body: {
      courtId: crypto.randomUUID(),
      label: input.label,
      startsAt: input.startsAt == null ? null : iso(input.startsAt),
      openUntil: input.openUntil == null ? null : iso(input.openUntil),
    },
    fields: { court: 'label', startsAt: 'startTime', openUntil: 'time' },
  })
  return accepted(courtOf(court), `${court.label} added`)
}

/** Add / Edit court on a saved court: label, planned start (fixed after use) and advisory end. */
export async function realUpdateCourt(input: {
  sessionId: string
  courtId: string
  label: string
  startsAt: number
  openUntil: number | null
}) {
  const { court } = await realRequest<{ court: WireCourt }>(
    courtPath(input.sessionId, input.courtId),
    {
      method: 'PATCH',
      body: {
        label: input.label,
        startsAt: iso(input.startsAt),
        openUntil: input.openUntil == null ? null : iso(input.openUntil),
      },
      fields: { court: 'label', startsAt: 'startTime', openUntil: 'time' },
    },
  )
  return accepted(courtOf(court), `${court.label} saved`)
}

/** Start anyway on one court; the booking, costs and minimum games stay as they are. */
export async function realOpenCourtEarly(input: { sessionId: string; courtId: string }) {
  const { court } = await realRequest<{ court: WireCourt }>(
    `${courtPath(input.sessionId, input.courtId)}/open-early`,
    { method: 'POST', body: {} },
  )
  return accepted(courtOf(court), `${court.label} opened early · planned ${planned(court)}`)
}

/** Open all courts now: every court not open yet opens early. */
export async function realOpenAllCourtsEarly(input: { sessionId: string }) {
  const { courts } = await realRequest<{ courts: WireCourt[] }>(
    `${sessionPath(input.sessionId)}/courts/open-early`,
    { method: 'POST', body: {} },
  )
  const [first] = courts
  return accepted(
    courts.map(courtOf),
    courts.length === 1 && first
      ? `${first.label} opened early · planned ${planned(first)}`
      : `${courts.length} courts opened early`,
  )
}

/** Undo early open: back to Not open yet, only while no match holds the court. */
export async function realUndoCourtEarlyOpen(input: { sessionId: string; courtId: string }) {
  const { court } = await realRequest<{ court: WireCourt }>(
    `${courtPath(input.sessionId, input.courtId)}/open-early`,
    { method: 'DELETE' },
  )
  return accepted(courtOf(court), `${court.label} back to Not open yet · opens ${planned(court)}`)
}

export async function realRemoveCourt(input: { sessionId: string; courtId: string }) {
  await realRequest(courtPath(input.sessionId, input.courtId), { method: 'DELETE' })
  return accepted(null, 'Court removed')
}

const endToast = (session: WireSession) =>
  `Session ends ${atWhenLabel(Date.parse(session.scheduledEndAt), Date.now())} · public page updates after sync`

/** Set end time (T2) at the displayed revision; the service applies the same rule as the mock. */
export async function realSetSessionEnd(input: { sessionId: string; endAt: number }) {
  const { revision } = await readSession(input.sessionId)
  const session = await realRequest<WireSession>(`${sessionPath(input.sessionId)}/end`, {
    method: 'POST',
    body: { expectedRevision: revision, endAt: iso(input.endAt) },
  })
  return accepted(await realGetQueueSession(input.sessionId), endToast(session))
}

/** Extend 30 / 60: the service adds the minutes to the saved end and runs Set end time's rule. */
export async function realExtendSession(input: { sessionId: string; minutes: 30 | 60 }) {
  const { revision } = await readSession(input.sessionId)
  const session = await realRequest<WireSession>(`${sessionPath(input.sessionId)}/extend`, {
    method: 'POST',
    body: { expectedRevision: revision, minutes: input.minutes },
  })
  return accepted(await realGetQueueSession(input.sessionId), endToast(session))
}

// ---------- Roster, presence and waitlist (Q-ROSTER, Q-WAITLIST) ----------

export async function realRemoveRosterPlayer(input: { sessionId: string; rosterId: string }) {
  await realRequest(
    `${sessionPath(input.sessionId)}/roster/${encodeURIComponent(input.rosterId)}`,
    { method: 'DELETE' },
  )
  return accepted(null, 'Removed from the roster')
}

export async function realSetPresenceMany(input: {
  sessionId: string
  changes: { rosterId: string; present: boolean }[]
}) {
  await realRequest(`${sessionPath(input.sessionId)}/presence`, {
    method: 'POST',
    body: { changes: input.changes },
  })
  const present = input.changes.filter((c) => c.present).length
  const away = input.changes.length - present
  const text =
    present && away
      ? `${present} player${present === 1 ? '' : 's'} marked present, ${away} away`
      : `${input.changes.length} player${input.changes.length === 1 ? '' : 's'} marked ${present ? 'present' : 'away'}`
  return accepted(null, text)
}

export async function realSetPresence(input: {
  sessionId: string
  rosterId: string
  present: boolean
}) {
  await realRequest(`${sessionPath(input.sessionId)}/presence`, {
    method: 'POST',
    body: { changes: [{ rosterId: input.rosterId, present: input.present }] },
  })
  return accepted(null, input.present ? 'Marked present' : 'Marked not present')
}

export async function realSetAllPresence(input: { sessionId: string; present: boolean }) {
  await realRequest(`${sessionPath(input.sessionId)}/presence`, {
    method: 'POST',
    body: { all: input.present },
  })
  return accepted(null, `Everyone marked ${input.present ? 'present' : 'absent'}`)
}

export async function realGiveSlot(input: { sessionId: string; waitlistId: string }) {
  await realRequest(
    `${sessionPath(input.sessionId)}/waitlist/${encodeURIComponent(input.waitlistId)}/slot`,
    { method: 'POST', body: { operationId: crypto.randomUUID() } },
  )
  return accepted(null, 'Got a slot')
}

export async function realFillOpenSlots(sessionId: string) {
  const { moved } = await realRequest<{ moved: number }>(
    `${sessionPath(sessionId)}/waitlist/fill`,
    { method: 'POST', body: { operationId: crypto.randomUUID() } },
  )
  return accepted(null, `${moved} players moved from the waitlist`)
}

export async function realRemoveFromWaitlist(input: { sessionId: string; waitlistId: string }) {
  await realRequest(
    `${sessionPath(input.sessionId)}/waitlist/${encodeURIComponent(input.waitlistId)}`,
    { method: 'DELETE' },
  )
  return accepted(null, 'Removed from the waitlist')
}

// ---------- Join requests ----------

type WirePlaced = {
  request: { name: string }
  rosterEntry: { clubPlayerId: string } | null
  waitlist: { clubPlayerId: string; position: number } | null
}

export async function realConfirmJoinRequest(input: { requestId: string; level: PlayingLevel }) {
  const placed = await realRequest<WirePlaced>(
    `/api/join-requests/${encodeURIComponent(input.requestId)}/confirm`,
    { method: 'POST', body: { operationId: crypto.randomUUID(), level: input.level } },
  )
  const waitlistPosition = placed.waitlist?.position ?? 0
  const data = {
    waitlistPosition,
    locked: false,
    clubPlayerId: placed.rosterEntry?.clubPlayerId ?? placed.waitlist?.clubPlayerId ?? '',
  }
  return accepted(
    data,
    `${placed.request.name} confirmed from a join request · ${waitlistPosition ? `waitlist #${waitlistPosition}` : levelLabel(input.level)}`,
  )
}

export async function realDeclineJoinRequest(requestId: string) {
  const { request } = await realRequest<{ request: { name: string } }>(
    `/api/join-requests/${encodeURIComponent(requestId)}/decline`,
    { method: 'POST', body: {} },
  )
  return accepted(null, `${request.name}'s join request declined`)
}
