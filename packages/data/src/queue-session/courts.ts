import { freeCourts } from '../match/match.rules'
import { MockError } from '../mock/errors'
import { queueMutation, sessionIn } from '../mock/transaction'

const hhmm = (n: number) =>
  new Date(n).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
export function addCourt(input: { sessionId: string; label: string; openUntil: number | null }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const session = sessionIn(s, input.sessionId)
    if (
      !input.label.trim() ||
      (input.openUntil !== null &&
        (!Number.isFinite(input.openUntil) ||
          input.openUntil <= Date.now() ||
          input.openUntil > session.scheduledEndAt))
    )
      throw new MockError('permission', 'Enter a court label and a booking end within the session.')
    const court = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      label: input.label.trim(),
      openUntil: input.openUntil,
      removedAt: null,
    }
    s.courts.push(court)
    return {
      data: court,
      text: `${court.label} added · open until ${hhmm(court.openUntil ?? session.scheduledEndAt)}`,
    }
  })
}
export function removeCourt(input: { sessionId: string; courtId: string }) {
  return queueMutation({ area: 'Courts and time', sessionId: input.sessionId }, (s) => {
    const courts = s.courts.filter((c) => c.sessionId === input.sessionId && !c.removedAt),
      court = courts.find((c) => c.id === input.courtId)
    if (!court || !freeCourts(courts, s.matches).some((c) => c.id === court.id))
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
