const STEPS_PER_DAY = 96
const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }

/** Local midnight of the calendar day that contains `instant`. */
export function startOfDay(instant: number): number {
  return new Date(instant).setHours(0, 0, 0, 0)
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function isWithinRange(instant: number, min?: number, max?: number): boolean {
  return (min == null || instant >= min) && (max == null || instant <= max)
}

export function isOnFifteenMinuteGrid(instant: number): boolean {
  const date = new Date(instant)
  return date.getMinutes() % 15 === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0
}

/** "7:00 PM", as the prototype's fmtTime shows a clock time. */
export function formatClockTime(instant: number): string {
  return new Date(instant).toLocaleTimeString('en-US', TIME_FORMAT)
}

/**
 * "Fri, Nov 6", with " · next day" when `instant` is the calendar day after `base`.
 * Matches the prototype's day-button labels.
 */
export function formatDayButtonLabel(instant: number, base: number): string {
  const date = new Date(instant).toLocaleDateString('en-US', DAY_FORMAT)
  const dayAfterBase = Math.round((startOfDay(instant) - startOfDay(base)) / 86_400_000) === 1
  return dayAfterBase ? `${date} · next day` : date
}

/** Unique local midnights for the offered days, in the order given. */
export function offeredDayStarts(days: readonly number[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const day of days) {
    const start = startOfDay(day)
    if (seen.has(start)) continue
    seen.add(start)
    out.push(start)
  }
  return out
}

/** 15-minute steps on `day` that sit inside min / max (inclusive). */
export function fifteenMinuteTimesOnDay(day: number, min?: number, max?: number): number[] {
  const date = new Date(day)
  const out: number[] = []
  for (let i = 0; i < STEPS_PER_DAY; i += 1) {
    const instant = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      i * 15,
    ).getTime()
    if (isWithinRange(instant, min, max)) out.push(instant)
  }
  return out
}

/**
 * Valid 15-minute times on `day`, plus the current value when it falls on that day
 * inside min / max but off the 15-minute grid (a court that opened at 10:42 PM).
 */
export function listedTimesOnDay(
  day: number,
  min: number | undefined,
  max: number | undefined,
  value: number | null,
): number[] {
  const times = fifteenMinuteTimesOnDay(day, min, max)
  if (
    value != null &&
    isSameDay(value, day) &&
    !times.includes(value) &&
    isWithinRange(value, min, max)
  ) {
    times.push(value)
    times.sort((a, b) => a - b)
  }
  return times
}

/**
 * Keep the previous clock time on `day` when that instant is inside min / max;
 * otherwise the day's first valid 15-minute time.
 */
export function instantForDay(
  day: number,
  from: number | null,
  min?: number,
  max?: number,
): number | null {
  if (from != null && isSameDay(from, day)) return from
  const ref = new Date(from ?? day)
  const want = new Date(startOfDay(day))
  want.setHours(ref.getHours(), ref.getMinutes(), 0, 0)
  if (isWithinRange(want.getTime(), min, max)) return want.getTime()
  return fifteenMinuteTimesOnDay(day, min, max)[0] ?? null
}
