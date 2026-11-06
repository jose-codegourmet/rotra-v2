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
  realSetSessionEnd,
  realUndoCourtEarlyOpen,
  realUpdateCourt,
} from '../real/session-live'
import { autoFillCourts, autoFillNote } from './courtFill'
import { recomputeMinimum } from './mutations'
import { atWhenLabel, sessionEndError } from './queueSession.rules'

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
    const placed = autoFillCourts(s, session.id, { onlyCourtIds: [court.id] })
    return {
      data: court,
      text: `${court.label} added · opens ${hhmm(startsAt)} · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}${autoFillNote(s, placed)}`,
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
    const placed = autoFillCourts(s, input.sessionId, { onlyCourtIds: [court.id] })
    return {
      data: court,
      text: `${court.label} opened early · planned ${hhmm(court.startsAt ?? 0)}${autoFillNote(s, placed)}`,
    }
  })
}
export function openAllCourtsEarly(input: { sessionId: string }) {
  if (isRealDataMode()) return realOpenAllCourtsEarly(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const courts = openEarly(s, input.sessionId, null)
    const placed = autoFillCourts(s, input.sessionId, { onlyCourtIds: courts.map((c) => c.id) })
    return {
      data: courts,
      text: `${
        courts.length === 1
          ? `${courts[0]?.label} opened early · planned ${hhmm(courts[0]?.startsAt ?? 0)}`
          : `${courts.length} courts opened early`
      }${autoFillNote(s, placed)}`,
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
/**
 * Set end time (T2): live, any time after now (later or earlier), at most 24 hours after the actual
 * start, which never moves. Courts that follow the session end (`openUntil` null) move with it; a
 * court that opens at or after the new end, or is booked past it, blocks it. Setting the end it
 * already has is a no-op, so a replay is repeat-safe.
 */
function applySessionEnd(s: MockState, sessionId: string, endAt: number) {
  const session = sessionIn(s, sessionId)
  if (session.state !== 'prepared' && session.state !== 'active')
    throw new MockError('permission', 'Only a prepared or running session can change its end.')
  const now = Date.now()
  if (endAt !== session.scheduledEndAt) {
    const error = sessionEndError({
      startedAt: session.startedAt ?? null,
      scheduledStartAt: session.scheduledStartAt,
      endAt,
      now,
      courts: s.courts.filter((c) => c.sessionId === session.id),
    })
    if (error) throw new MockError('permission', error)
    session.scheduledEndAt = endAt
    recomputeMinimum(s, sessionId)
  }
  return {
    data: session,
    text: `Session ends ${atWhenLabel(session.scheduledEndAt, now)} · public page updates after sync`,
  }
}
export function setSessionEnd(input: { sessionId: string; endAt: number }) {
  if (isRealDataMode()) return realSetSessionEnd(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) =>
    applySessionEnd(s, input.sessionId, input.endAt),
  )
}
/** Extend 30 / 60 min: shortcuts for Set end time on the current end plus the minutes. */
export function extendSession(input: { sessionId: string; minutes: 30 | 60 }) {
  if (isRealDataMode()) return realExtendSession(input)
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    if (input.minutes !== 30 && input.minutes !== 60)
      throw new MockError('permission', 'Choose 30 or 60 minutes.')
    const session = sessionIn(s, input.sessionId)
    return applySessionEnd(s, input.sessionId, session.scheduledEndAt + input.minutes * 60000)
  })
}
