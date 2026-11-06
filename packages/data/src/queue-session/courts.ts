import { courtWindowError } from '@rotra/schema/court-window'
import { courtOpen, holdsCourt, openedEarly } from '../match/match.rules'
import { requireLive } from '../match/queue.mutations'
import { MockError } from '../mock/errors'
import type { MockState } from '../mock/store'
import { queueMutation, sessionIn } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'
import {
  realAddCourt,
  realExtendSession,
  realOpenAllCourtsEarly,
  realOpenCourtEarly,
  realRemoveCourt,
  realUndoCourtEarlyOpen,
  realUpdateCourt,
} from '../real/session-live'

const hhmm = (n: number) =>
  new Date(n).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export function addCourt(input: {
  sessionId: string
  label: string
  startsAt?: number
  openUntil: number | null
}) {
  if (isRealDataMode()) return realAddCourt(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = sessionIn(s, input.sessionId)
    const startsAt = input.startsAt ?? session.startedAt ?? session.scheduledStartAt
    const error = courtWindowError(
      startsAt,
      input.openUntil,
      session.startedAt ?? session.scheduledStartAt,
      session.scheduledEndAt,
    )
    if (!input.label.trim() || input.label.trim().length > 40 || error)
      throw new MockError('permission', error ?? 'Enter a court label of at most 40 characters.')
    const court = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      label: input.label.trim(),
      startsAt,
      openUntil: input.openUntil,
      removedAt: null,
    }
    s.courts.push(court)
    return {
      data: court,
      text: `${court.label} added · opens ${hhmm(startsAt)} · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}`,
    }
  })
}

export function updateCourt(input: {
  sessionId: string
  courtId: string
  label: string
  startsAt: number
  openUntil: number | null
}) {
  if (isRealDataMode()) return realUpdateCourt(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = sessionIn(s, input.sessionId)
    const court = s.courts.find(
      (c) => c.id === input.courtId && c.sessionId === session.id && !c.removedAt,
    )
    if (!court) throw new MockError('conflict', 'Court no longer available.')
    if (
      (court.openedEarlyAt != null ||
        s.matches.some((m) => m.sessionId === session.id && m.courtIds.includes(court.id))) &&
      input.startsAt !== (court.startsAt ?? session.startedAt ?? session.scheduledStartAt)
    )
      throw new MockError('permission', 'Start is fixed after use.')
    const error = courtWindowError(
      input.startsAt,
      input.openUntil,
      Math.min(session.startedAt ?? session.scheduledStartAt, court.startsAt ?? Infinity),
      session.scheduledEndAt,
    )
    if (!input.label.trim() || input.label.trim().length > 40 || error)
      throw new MockError('permission', error ?? 'Enter a court label of at most 40 characters.')
    Object.assign(court, {
      label: input.label.trim(),
      startsAt: input.startsAt,
      openUntil: input.openUntil,
    })
    return {
      data: court,
      text: `${court.label} saved · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}`,
    }
  })
}
/** Start anyway: opens not-yet-open courts now. The planned start, costs and minimum games stay as they are. */
function openEarly(s: MockState, sessionId: string, courtIds: string[] | null) {
  const session = requireLive(s, sessionId),
    now = Date.now()
  const live = s.courts.filter((c) => c.sessionId === session.id && !c.removedAt)
  const courts = courtIds
    ? courtIds.map((id) => live.find((c) => c.id === id))
    : live.filter((c) => !courtOpen(c, now))
  if (!courts.length || courts.some((c) => !c || courtOpen(c, now)))
    throw new MockError('conflict', 'Something changed. Review the courts again.')
  for (const c of courts) if (c) c.openedEarlyAt = now
  return courts.flatMap((c) => (c ? [c] : []))
}
export function openCourtEarly(input: { sessionId: string; courtId: string }) {
  if (isRealDataMode()) return realOpenCourtEarly(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const [court] = openEarly(s, input.sessionId, [input.courtId])
    if (!court) throw new MockError('conflict', 'Something changed. Review the courts again.')
    return {
      data: court,
      text: `${court.label} opened early · planned ${hhmm(court.startsAt ?? 0)}`,
    }
  })
}
export function openAllCourtsEarly(input: { sessionId: string }) {
  if (isRealDataMode()) return realOpenAllCourtsEarly(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const courts = openEarly(s, input.sessionId, null)
    return {
      data: courts,
      text:
        courts.length === 1
          ? `${courts[0]?.label} opened early · planned ${hhmm(courts[0]?.startsAt ?? 0)}`
          : `${courts.length} courts opened early`,
    }
  })
}
/** Undo early open: back to Not open yet, only while no On court or Playing match holds it. */
export function undoCourtEarlyOpen(input: { sessionId: string; courtId: string }) {
  if (isRealDataMode()) return realUndoCourtEarlyOpen(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = requireLive(s, input.sessionId)
    const court = s.courts.find(
      (c) => c.id === input.courtId && c.sessionId === session.id && !c.removedAt,
    )
    if (!court || !openedEarly(court))
      throw new MockError('conflict', 'Something changed. Review the courts again.')
    if (s.matches.some((m) => holdsCourt(m) && m.courtIds.includes(court.id)))
      throw new MockError('permission', 'Only a free court can go back to Not open yet.')
    court.openedEarlyAt = null
    return {
      data: court,
      text: `${court.label} back to Not open yet · opens ${hhmm(court.startsAt ?? 0)}`,
    }
  })
}
export function removeCourt(input: { sessionId: string; courtId: string }) {
  if (isRealDataMode()) return realRemoveCourt(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const courts = s.courts.filter((c) => c.sessionId === input.sessionId && !c.removedAt),
      court = courts.find((c) => c.id === input.courtId)
    if (!court || s.matches.some((m) => holdsCourt(m) && m.courtIds.includes(court.id)))
      throw new MockError('permission', 'Only a free court can be removed')
    if (courts.length <= 1) throw new MockError('permission', 'At least one court must remain.')
    court.removedAt = Date.now()
    return { data: null, text: `${court.label} removed` }
  })
}
export function extendSession(input: { sessionId: string; minutes: 30 | 60 }) {
  if (isRealDataMode()) return realExtendSession(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    if (input.minutes !== 30 && input.minutes !== 60)
      throw new MockError('permission', 'Choose 30 or 60 minutes.')
    const session = sessionIn(s, input.sessionId)
    session.scheduledEndAt += input.minutes * 60000
    return { data: null, text: `Session now ends ${hhmm(session.scheduledEndAt)}` }
  })
}
