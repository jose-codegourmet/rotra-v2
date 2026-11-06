const MINUTE = 60_000
const DAY = 864e5

/** A session ends after it starts and at most 24 hours later (T1). */
export const MAX_SESSION_MS = DAY
export const SESSION_END_ERROR = 'Choose an end after the start.'

/**
 * Clock-only bridge: an "HH:mm" on the local calendar day "YYYY-MM-DD". The day is given, never
 * guessed. NaN when either value is not valid.
 */
export function instantOnDate(date: string, hhmm: string): number {
  const [y, mo, d] = date.split('-').map(Number)
  const [hour, minute] = hhmm.split(':').map(Number)
  if (![y, mo, d, hour, minute].every((n) => Number.isInteger(n))) return Number.NaN
  return new Date(y as number, (mo as number) - 1, d, hour, minute).getTime()
}

/**
 * Clock-only bridge, the one place a time field's "HH:mm" becomes an instant until the
 * date-and-time picker (Q12.24) sends the day itself: the first such clock time at or after the
 * `from` minute, so less than 24 hours later. NaN for an invalid time.
 */
export function clockTimeFrom(from: number, hhmm: string): number {
  const [hour, minute] = hhmm.split(':').map(Number)
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isFinite(from))
    return Number.NaN
  const date = new Date(from)
  date.setHours(hour as number, minute as number, 0, 0)
  if (date.getTime() < from - (from % MINUTE)) date.setDate(date.getDate() + 1)
  return date.getTime()
}

/**
 * A planned court time as a full instant. A time in the session start's minute is the session
 * start itself: a live session's actual start carries seconds while time fields have minutes.
 */
export function courtTimeOnSession(sessionStartsAt: number, at: number): number {
  return at < sessionStartsAt && sessionStartsAt - at < MINUTE ? sessionStartsAt : at
}

/** Session window: the end is after the start and at most 24 hours later. */
export function sessionWindowError(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Enter a date and time.'
  if (end <= start || end - start > MAX_SESSION_MS) return SESSION_END_ERROR
  return null
}

/**
 * Shared by setup, Add / Edit court and the mock command (the service mirrors it): the planned
 * start is never before the session start and is before the session end; the end (null = session
 * end) is after the start and not after the session end. Planned endings are advisory.
 */
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

/** Whether `at` falls on another calendar day than the session start ("· next day"). */
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
