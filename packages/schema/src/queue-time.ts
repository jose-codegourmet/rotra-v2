/**
 * Correct Queue Time Format (owner, 2026-11-19): how long ago something started, as one short phrase.
 * Under 60 minutes "N min", from 60 minutes whole hours rounded down "N h", from 24 hours "long time ago".
 * Used for waits on Players cards and queued match faces, how long ago the planned end passed, elapsed
 * match time, free-court chips, the substitution hint, the profile status and suggestion waits.
 * Time left before the end and planned-time displays are not elapsed times and do not use it.
 */
export const LONG_TIME_AGO = 'long time ago'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1440

/** Whole minutes, never negative; NaN reads as 0 (prototype queueTime guard). */
function wholeMinutes(minutes: number): number {
  const whole = Math.floor(minutes)
  return Number.isFinite(whole) ? Math.max(0, whole) : 0
}

/** True from 24 hours on, when the time is no longer shown as a number. */
export function isLongTimeAgo(minutes: number): boolean {
  return wholeMinutes(minutes) >= MINUTES_PER_DAY
}

/** "N min" under 60 minutes, "N h" from 60 minutes (rounded down), "long time ago" from 24 hours. */
export function queueTime(minutes: number): string {
  const m = wholeMinutes(minutes)
  if (m < MINUTES_PER_HOUR) return `${m} min`
  if (m < MINUTES_PER_DAY) return `${Math.floor(m / MINUTES_PER_HOUR)} h`
  return LONG_TIME_AGO
}

/** Elapsed match time on a court line: "2 h", or "started long time ago" from 24 hours. */
export function elapsedTime(minutes: number): string {
  return isLongTimeAgo(minutes) ? `started ${LONG_TIME_AGO}` : queueTime(minutes)
}

/** A player's wait: "2 h wait", or "long time ago" (no "wait") from 24 hours. */
export function waitPhrase(minutes: number): string {
  return isLongTimeAgo(minutes) ? LONG_TIME_AGO : `${queueTime(minutes)} wait`
}

/** The planned end already passed: "Planned end passed 3 h ago", "Planned end passed long time ago". */
export function plannedEndPassed(minutes: number): string {
  return isLongTimeAgo(minutes)
    ? `Planned end passed ${LONG_TIME_AGO}`
    : `Planned end passed ${queueTime(minutes)} ago`
}

/** "Started 5 min ago", or "Started long time ago" (substitution hint). */
export function startedAgo(minutes: number): string {
  return isLongTimeAgo(minutes) ? `Started ${LONG_TIME_AGO}` : `Started ${queueTime(minutes)} ago`
}
