/** Place a booking time on the session day, or the next day for an overnight session. */
export function courtTimeOnSession(sessionStartsAt: number, hhmm: string) {
  const [hour = 0, minute = 0] = hhmm.split(':').map(Number)
  const date = new Date(sessionStartsAt)
  date.setHours(hour, minute, 0, 0)
  // A live/mock session may carry seconds while the time field has minute precision.
  if (date.getTime() < sessionStartsAt && sessionStartsAt - date.getTime() < 60000)
    return sessionStartsAt
  if (date.getTime() < sessionStartsAt) date.setDate(date.getDate() + 1)
  return date.getTime()
}

/** Shared by preparation, live editing and the mock command; planned endings are advisory. */
export function courtWindowError(
  start: number,
  end: number | null,
  sessionStart: number,
  sessionEnd: number,
) {
  const until = end ?? sessionEnd
  if (![start, until, sessionStart, sessionEnd].every(Number.isFinite))
    return 'Enter valid booking times.'
  if (until > sessionEnd) return courtAfterSessionEndError(sessionEnd)
  if (start < sessionStart || start >= sessionEnd)
    return 'Choose a planned start within the session.'
  if (until <= start) return 'Choose an end after the planned start.'
  return null
}

export function courtNextDay(at: number, sessionStart: number) {
  return new Date(at).toDateString() !== new Date(sessionStart).toDateString()
}

/** Shared copy for a court closing after the Queue Session. */
export function courtAfterSessionEndError(sessionEnd: number) {
  const time = new Date(sessionEnd).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `That's after the session ends at ${time}. Pick an earlier time, or extend the session first.`
}

/** Validated planned booking, independent of the UI and the current wall clock. */
export function courtWindowPreview({
  start,
  end,
  sessionStart,
  sessionEnd,
  now,
}: {
  start: number
  end: number | null
  sessionStart: number
  sessionEnd: number
  now: number
}) {
  const error = courtWindowError(start, end, sessionStart, sessionEnd)
  if (error) return { error }
  const closesAt = end ?? sessionEnd
  return {
    opensAt: start,
    closesAt,
    lengthMin: Math.round((closesAt - start) / 60000),
    opensInMin: start > now ? Math.max(1, Math.round((start - now) / 60000)) : null,
    nextDay: courtNextDay(closesAt, sessionStart),
  }
}
