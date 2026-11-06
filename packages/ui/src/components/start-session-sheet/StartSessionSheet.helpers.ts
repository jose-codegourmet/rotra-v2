import { clubDayDiff, formatShortDate, formatTime } from '@rotra/ui/now-card/helpers'

const DAY = 86_400_000
const QUARTER_HOUR_MINUTES = 15

/**
 * Round up to the next 15-minute step (an exact step stays), like the prototype's ceil15(). Uses the
 * same local clock as DateTimePicker's 15-minute grid, so the result is always a listed time.
 */
export function ceilToQuarterHour(at: number): number {
  const date = new Date(at)
  const minutes = date.getMinutes()
  const exact =
    minutes % QUARTER_HOUR_MINUTES === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0
  date.setSeconds(0, 0)
  if (!exact) date.setMinutes(minutes - (minutes % QUARTER_HOUR_MINUTES) + QUARTER_HOUR_MINUTES)
  return date.getTime()
}

/**
 * T3: starting after the planned end, or on another day than planned, needs a new end first
 * (the prototype's startNeedsEnd()).
 */
export function startNeedsNewEnd(
  plannedStartAt: number,
  plannedEndAt: number,
  now: number,
): boolean {
  return now > plannedEndAt || clubDayDiff(plannedStartAt, now) !== 0
}

/** The New end pre-fill: now plus the planned length, rounded up to 15 minutes. */
export function defaultNewEnd(plannedStartAt: number, plannedEndAt: number, now: number): number {
  return ceilToQuarterHour(now + (plannedEndAt - plannedStartAt))
}

/** The New end bounds: after now and at most 24 hours later. */
export function newEndBounds(now: number): { min: number; max: number } {
  return { min: now + 1, max: now + DAY }
}

/**
 * "6:00–9:00 PM yesterday", "6:00–9:00 PM tomorrow", or "Sat, Nov 1, 6:00–9:00 PM" further away
 * (the prototype's plannedFor()). The first AM/PM drops when both times share it on one day.
 */
export function formatPlannedFor(
  plannedStartAt: number,
  plannedEndAt: number,
  now: number,
): string {
  const start = formatTime(plannedStartAt)
  const end = formatTime(plannedEndAt)
  const startPeriod = start.slice(-2)
  const sameDay = clubDayDiff(plannedStartAt, plannedEndAt) === 0
  const endDays = clubDayDiff(plannedStartAt, plannedEndAt)
  const shownStart = sameDay && startPeriod === end.slice(-2) ? start.slice(0, -3) : start
  const later =
    endDays === 1 ? ' · next day' : endDays > 1 ? ` · ${formatShortDate(plannedEndAt)}` : ''
  const range = `${shownStart}–${end}${later}`
  const days = clubDayDiff(now, plannedStartAt)
  if (days === 0) return range
  if (days === -1) return `${range} yesterday`
  if (days === 1) return `${range} tomorrow`
  return `${formatShortDate(plannedStartAt)}, ${range}`
}
