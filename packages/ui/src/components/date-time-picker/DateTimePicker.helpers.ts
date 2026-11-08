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

// ── Hour / minute / AM-PM pickers ─────────────────────────────────────────────────────────────────
// Every helper below works on one calendar day in local time, and treats a time as valid exactly
// when listedTimesOnDay() lists it: 15-minute steps inside min / max, plus the current off-grid value.

export type Meridiem = 'AM' | 'PM'

/** Hour choices in display order: 12, 1, 2 … 11. */
export const HOUR_CHOICES: readonly number[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
export const GRID_MINUTES: readonly number[] = [0, 15, 30, 45]
export const MERIDIEMS: readonly Meridiem[] = ['AM', 'PM']

/** The day being picked on, its bounds, and the field's current value. */
export type TimeWindow = {
  /** Any instant on the day (local) */
  day: number
  min?: number
  max?: number
  value: number | null
}

/** The clock parts a pick starts from; null where nothing is known yet. */
export type ClockDraft = {
  /** 1–12 */
  hour: number | null
  minute: number | null
  meridiem: Meridiem | null
}

export type ClockParts = { hour: number; minute: number; meridiem: Meridiem }

/** 12-hour clock parts of `instant` in local time (0:30 → 12, 30, AM). */
export function clockParts(instant: number): ClockParts {
  const date = new Date(instant)
  const hours = date.getHours()
  return {
    hour: hours % 12 === 0 ? 12 : hours % 12,
    minute: date.getMinutes(),
    meridiem: hours < 12 ? 'AM' : 'PM',
  }
}

/** "09", "12", "00", "42": two-digit hour or minute for the dropdowns. */
export function formatTwoDigits(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local instant on `day` at the 12-hour clock time. */
export function instantAtClock(
  day: number,
  hour: number,
  minute: number,
  meridiem: Meridiem,
): number {
  const date = new Date(startOfDay(day))
  date.setHours((hour % 12) + (meridiem === 'PM' ? 12 : 0), minute, 0, 0)
  return date.getTime()
}

/** The valid times on the window's day (listedTimesOnDay). */
export function validTimes(w: TimeWindow): number[] {
  return listedTimesOnDay(startOfDay(w.day), w.min, w.max, w.value)
}

/** AM and / or PM, when that half of the day has at least one valid time. */
export function validMeridiems(w: TimeWindow): Meridiem[] {
  const halves = new Set(validTimes(w).map((t) => clockParts(t).meridiem))
  return MERIDIEMS.filter((m) => halves.has(m))
}

/** 12-hour hours that have at least one valid time in `meridiem`, in HOUR_CHOICES order. */
export function validHours(w: TimeWindow, meridiem: Meridiem | null): number[] {
  const hours = new Set(
    validTimes(w)
      .map(clockParts)
      .filter((p) => meridiem == null || p.meridiem === meridiem)
      .map((p) => p.hour),
  )
  return HOUR_CHOICES.filter((h) => hours.has(h))
}

/**
 * Minutes that give a valid time at `hour` in `meridiem`. With no hour yet, minutes valid at any
 * hour of that half (or of the day, with no half either).
 */
export function validMinutes(
  w: TimeWindow,
  hour: number | null,
  meridiem: Meridiem | null,
): number[] {
  const minutes = new Set(
    validTimes(w)
      .map(clockParts)
      .filter(
        (p) => (hour == null || p.hour === hour) && (meridiem == null || p.meridiem === meridiem),
      )
      .map((p) => p.minute),
  )
  return [...minutes].sort((a, b) => a - b)
}

/**
 * Minute dropdown options: 00, 15, 30, 45, plus the current value's minute while the value is on
 * this day, inside min / max and off the 15-minute grid (a court that opened at 10:42 PM → 42).
 */
export function minuteChoices(w: TimeWindow): number[] {
  const out = [...GRID_MINUTES]
  if (w.value != null && validTimes(w).includes(w.value) && !isOnFifteenMinuteGrid(w.value)) {
    const minute = clockParts(w.value).minute
    if (!out.includes(minute)) out.push(minute)
    out.sort((a, b) => a - b)
  }
  return out
}

/**
 * What a pick starts from: the value's clock parts, else the fallback's (court fields: session
 * start / end). With neither, no hour or minute, and the half of the day's first valid time.
 */
export function clockDraft(w: TimeWindow, fallback?: number): ClockDraft {
  const from = w.value ?? fallback
  if (from != null) return clockParts(from)
  return { hour: null, minute: null, meridiem: validMeridiems(w)[0] ?? null }
}

function firstValid(times: number[], keep: (p: ClockParts) => boolean): number | null {
  return times.find((t) => keep(clockParts(t))) ?? null
}

/**
 * Hour change: same day and AM/PM; keep the minute when that time is valid, else the first valid
 * minute in that hour. Null when the hour has no valid time.
 */
export function pickHour(w: TimeWindow, draft: ClockDraft, hour: number): number | null {
  const times = validTimes(w)
  const meridiem = draft.meridiem ?? validMeridiems(w)[0] ?? 'AM'
  if (draft.minute != null) {
    const kept = instantAtClock(w.day, hour, draft.minute, meridiem)
    if (times.includes(kept)) return kept
  }
  return firstValid(times, (p) => p.hour === hour && p.meridiem === meridiem)
}

/**
 * Minute change: the draft's hour, AM/PM and day with that minute. With no hour yet, the first
 * valid time with that minute in the draft's half. Null when no such time is valid.
 */
export function pickMinute(w: TimeWindow, draft: ClockDraft, minute: number): number | null {
  const times = validTimes(w)
  if (draft.hour != null && draft.meridiem != null) {
    const wanted = instantAtClock(w.day, draft.hour, minute, draft.meridiem)
    return times.includes(wanted) ? wanted : null
  }
  return firstValid(
    times,
    (p) => p.minute === minute && (draft.meridiem == null || p.meridiem === draft.meridiem),
  )
}

/**
 * AM/PM change: keep the hour and minute when valid in the other half, else the first valid time
 * in that half. Null when the half has no valid time.
 */
export function pickMeridiem(w: TimeWindow, draft: ClockDraft, meridiem: Meridiem): number | null {
  const times = validTimes(w)
  if (draft.hour != null && draft.minute != null) {
    const kept = instantAtClock(w.day, draft.hour, draft.minute, meridiem)
    if (times.includes(kept)) return kept
  }
  return firstValid(times, (p) => p.meridiem === meridiem)
}

/**
 * "Set time" from the empty option: the fallback when it is on an offered day inside min / max,
 * else the first valid 15-minute time on the fallback's day, then on the other offered days in order.
 * Null when no offered day has one.
 */
export function setTimeInstant(
  days: readonly number[],
  min: number | undefined,
  max: number | undefined,
  fallback: number | undefined,
): number | null {
  const offered = offeredDayStarts(days)
  const fallbackDay = fallback == null ? null : startOfDay(fallback)
  if (fallback != null && fallbackDay != null && offered.includes(fallbackDay)) {
    if (isWithinRange(fallback, min, max)) return fallback
    offered.sort((a, b) => Number(b === fallbackDay) - Number(a === fallbackDay))
  }
  for (const day of offered) {
    const first = fifteenMinuteTimesOnDay(day, min, max)[0]
    if (first != null) return first
  }
  return null
}
