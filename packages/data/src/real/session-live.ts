import type { PlayingLevel } from '../player/player.types'
import type { QueueSessionInput } from '../queue-session/queueSession.types'
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

export async function realStartSession(sessionId: string) {
  const { revision } = await readSession(sessionId)
  await realRequest<WireSession>(`${sessionPath(sessionId)}/start`, {
    method: 'POST',
    body: { expectedRevision: revision },
    fields: { roster: 'roster', session: 'session' },
  })
  return accepted(await realGetQueueSession(sessionId), 'Session started · levels locked')
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

export async function realSetAcceptJoinRequests(input: { sessionId: string; accept: boolean }) {
  await realRequest<WireSession>(sessionPath(input.sessionId), {
    method: 'PATCH',
    body: { acceptJoinRequests: input.accept },
  })
  return accepted(null, `Join requests are ${input.accept ? 'on' : 'off'}`)
}

// ---------- Courts and time ----------

export async function realAddCourt(input: {
  sessionId: string
  label: string
  startsAt?: number
  openUntil: number | null
}) {
  const { court } = await realRequest<{
    court: { id: string; sessionId: string; label: string; openUntil: string | null }
  }>(`${sessionPath(input.sessionId)}/courts`, {
    method: 'POST',
    body: {
      courtId: crypto.randomUUID(),
      label: input.label,
      openUntil: input.openUntil == null ? null : iso(input.openUntil),
    },
    fields: { court: 'label' },
  })
  const data = {
    id: court.id,
    sessionId: court.sessionId,
    label: court.label,
    // Saved courts have no own start yet; the session start applies.
    startsAt: input.startsAt,
    openUntil: court.openUntil ? Date.parse(court.openUntil) : null,
    removedAt: null,
  }
  return accepted(data, `${court.label} added`)
}

export async function realRemoveCourt(input: { sessionId: string; courtId: string }) {
  await realRequest(`${sessionPath(input.sessionId)}/courts/${encodeURIComponent(input.courtId)}`, {
    method: 'DELETE',
  })
  return accepted(null, 'Court removed')
}

export async function realExtendSession(input: { sessionId: string; minutes: 30 | 60 }) {
  const { revision } = await readSession(input.sessionId)
  const session = await realRequest<WireSession>(`${sessionPath(input.sessionId)}/extend`, {
    method: 'POST',
    body: { expectedRevision: revision, minutes: input.minutes },
  })
  return accepted(null, `Session now ends ${hhmm(session.scheduledEndAt)}`)
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
