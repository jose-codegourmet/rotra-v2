const MINUTE = 60_000

/** Club display and entry zone for v1 (T6). Storage stays instants. */
export const CLUB_TIME_ZONE = 'Asia/Manila'

const TIME_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: CLUB_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const DATE_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: CLUB_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const CLUB_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLUB_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? ''
}

/** Calendar day in the club zone as a UTC-midnight instant, for day arithmetic only. */
function clubDayUtc(at: number): number {
  return Date.parse(`${CLUB_DAY.format(new Date(at))}T00:00:00Z`)
}

/** Whole club-zone days from `from` to `to` (yesterday −1, today 0, tomorrow 1). */
export function clubDayDiff(from: number, to: number): number {
  return Math.round((clubDayUtc(to) - clubDayUtc(from)) / 864e5)
}

function laterDay(base: number, at: number): string {
  const days = clubDayDiff(base, at)
  if (days === 1) return ' · next day'
  if (days > 1) return ` · ${formatShortDate(at)}`
  return ''
}

/** "9:00 PM" in the club time zone, like the prototype's fmtTime. */
export function formatTime(at: number): string {
  const parts = TIME_PARTS.formatToParts(new Date(at))
  return `${part(parts, 'hour')}:${part(parts, 'minute')} ${part(parts, 'dayPeriod')}`
}

/** "Sun, Oct 25" in the club time zone, like the prototype's fmtDate. */
export function formatShortDate(at: number): string {
  const parts = DATE_PARTS.formatToParts(new Date(at))
  return `${part(parts, 'weekday')}, ${part(parts, 'month')} ${part(parts, 'day')}`
}

/**
 * Every time shows its day (T4): "9:00 PM" today, "Yesterday 10:42 PM" / "Tomorrow 7:00 PM",
 * or "Sat, Nov 1 · 9:00 PM" further away. Pass `{ lower: true }` mid-sentence.
 */
export function formatWhen(at: number, now: number, options?: { lower?: boolean }): string {
  const days = clubDayDiff(now, at)
  if (days === 0) return formatTime(at)
  if (days === 1 || days === -1) {
    const word = days < 0 ? 'Yesterday' : 'Tomorrow'
    return `${options?.lower ? word.toLowerCase() : word} ${formatTime(at)}`
  }
  return `${formatShortDate(at)} · ${formatTime(at)}`
}

/** "7:00 PM–1:00 AM · next day" when the end falls on the day after `base` (the start by default). */
export function formatTimeRange(from: number, to: number, base: number = from): string {
  return `${formatTime(from)}–${formatTime(to)}${laterDay(base, to)}`
}

/** Start carries its day word; the end only marks "· next day". */
export function formatWhenRange(
  from: number,
  to: number,
  now: number,
  options?: { lower?: boolean },
): string {
  return `${formatWhen(from, now, options)}–${formatTime(to)}${laterDay(from, to)}`
}

/** "2 h 15 min" between two times, like the prototype's fmtDur (wraps past midnight). */
export function formatDuration(from: number, to: number): string {
  let minutes = Math.round((to - from) / MINUTE)
  if (minutes <= 0) minutes += 1440
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours} h${rest ? ` ${rest} min` : ''}`
}

/**
 * The countdown on the upcoming badge, with the prototype's untilText() rules: "Starts in 45 min",
 * "Starts in 2 h 15 min", "Tomorrow, 6:00 PM", "In 3 days · Sun, Nov 1", "Starting now" (up to
 * 15 minutes after the start), "Was due 6:00 PM · not started".
 */
export function formatCountdown(startsAt: number, now: number): string {
  const minutes = Math.round((startsAt - now) / MINUTE)
  if (minutes <= 0) {
    return minutes > -15 ? 'Starting now' : `Was due ${formatTime(startsAt)} · not started`
  }
  if (minutes < 60) return `Starts in ${minutes} min`
  const days = clubDayDiff(now, startsAt)
  if (days === 0) {
    return `Starts in ${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
  }
  return days === 1
    ? `Tomorrow, ${formatTime(startsAt)}`
    : `In ${days} days · ${formatShortDate(startsAt)}`
}
