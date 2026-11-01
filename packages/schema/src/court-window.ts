/** Place a booking time on the session day, or the next day for an overnight session. */
export function courtTimeOnSession(sessionStartsAt: number, hhmm: string) {
  const [hour = 0, minute = 0] = hhmm.split(':').map(Number)
  const date = new Date(sessionStartsAt)
  date.setHours(hour, minute, 0, 0)
  if (date.getTime() < sessionStartsAt) date.setDate(date.getDate() + 1)
  return date.getTime()
}

/** Shared by preparation, live editing and the mock command; planned endings are advisory. */
export function courtWindowError(start: number, end: number | null, sessionStart: number, sessionEnd: number) {
  const until = end ?? sessionEnd
  if (![start, until, sessionStart, sessionEnd].every(Number.isFinite)) return 'Enter valid booking times.'
  if (start < sessionStart || start >= sessionEnd) return 'Choose a planned start within the session.'
  if (until <= start) return 'Choose an end after the planned start.'
  if (until > sessionEnd) return 'Extend the session before choosing a later court end.'
  return null
}

export function courtNextDay(at: number, sessionStart: number) {
  return new Date(at).toDateString() !== new Date(sessionStart).toDateString()
}
