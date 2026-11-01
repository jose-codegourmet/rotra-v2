import { courtWindowError } from '@rotra/schema/court-window'
import { MockError } from '../mock/errors'
import { queueMutation, sessionIn } from '../mock/transaction'

const hhmm = (n: number) =>
  new Date(n).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export function addCourt(input: { sessionId: string; label: string; startsAt?: number; openUntil: number | null }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = sessionIn(s, input.sessionId)
    const startsAt = input.startsAt ?? session.scheduledStartAt
    const error = courtWindowError(startsAt, input.openUntil, session.scheduledStartAt, session.scheduledEndAt)
    if (!input.label.trim() || input.label.trim().length > 40 || error)
      throw new MockError('permission', error ?? 'Enter a court label of at most 40 characters.')
    const court = { id: crypto.randomUUID(), sessionId: session.id, label: input.label.trim(), startsAt, openUntil: input.openUntil, removedAt: null }
    s.courts.push(court)
    return { data: court, text: `${court.label} added · opens ${hhmm(startsAt)} · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}` }
  })
}

export function updateCourt(input: { sessionId: string; courtId: string; label: string; startsAt: number; openUntil: number | null }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = sessionIn(s, input.sessionId)
    const court = s.courts.find((c) => c.id === input.courtId && c.sessionId === session.id && !c.removedAt)
    if (!court) throw new MockError('conflict', 'Court no longer available.')
    if (s.matches.some((m) => m.sessionId === session.id && m.courtIds.includes(court.id)) && input.startsAt !== (court.startsAt ?? session.scheduledStartAt))
      throw new MockError('permission', 'Start is fixed after use.')
    const error = courtWindowError(input.startsAt, input.openUntil, session.scheduledStartAt, session.scheduledEndAt)
    if (!input.label.trim() || input.label.trim().length > 40 || error)
      throw new MockError('permission', error ?? 'Enter a court label of at most 40 characters.')
    Object.assign(court, { label: input.label.trim(), startsAt: input.startsAt, openUntil: input.openUntil })
    return { data: court, text: `${court.label} saved · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}` }
  })
}
export function removeCourt(input: { sessionId: string; courtId: string }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const courts = s.courts.filter((c) => c.sessionId === input.sessionId && !c.removedAt),
      court = courts.find((c) => c.id === input.courtId)
    if (!court || s.matches.some((m) => m.state === 'active' && m.courtIds.includes(court.id)))
      throw new MockError('permission', 'Only a free court can be removed')
    if (courts.length <= 1) throw new MockError('permission', 'At least one court must remain.')
    court.removedAt = Date.now()
    return { data: null, text: `${court.label} removed` }
  })
}
export function extendSession(input: { sessionId: string; minutes: 30 | 60 }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    if (input.minutes !== 30 && input.minutes !== 60)
      throw new MockError('permission', 'Choose 30 or 60 minutes.')
    const session = sessionIn(s, input.sessionId)
    session.scheduledEndAt += input.minutes * 60000
    return { data: null, text: `Session now ends ${hhmm(session.scheduledEndAt)}` }
  })
}
