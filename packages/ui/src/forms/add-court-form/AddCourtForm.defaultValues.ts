import type { AddCourtFormInput } from './AddCourtForm.schema'

/** A timestamp as the "HH:mm" a time field holds (the prototype's hhmm()). */
export function toTimeInput(at: number): string {
  const date = new Date(at)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** The next court label for a session with this many courts: "Court N". */
export function nextCourtLabel(courtCount: number): string {
  return `Court ${courtCount + 1}`
}

/** Until the session ends, with the time field pre-filled with the end time, as the prototype opens it. */
export function addCourtFormDefaultValues(sessionEndsAt: number): AddCourtFormInput {
  return { label: '', mode: 'end', time: toTimeInput(sessionEndsAt) }
}
