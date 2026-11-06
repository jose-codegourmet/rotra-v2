import { describe, expect, it } from 'vitest'
import {
  clockTimeFrom,
  courtNextDay,
  courtTimeOnSession,
  courtWindowError,
  courtWindowPreview,
  instantOnDate,
  SESSION_END_ERROR,
  sessionWindowError,
} from './court-window'

const at = (hour: number, minute = 0, day = 1) => new Date(2026, 10, day, hour, minute).getTime()
const window = { sessionStart: at(18), sessionEnd: at(23), now: at(12, 12) }

describe('court window preview', () => {
  it('counts down to the planned start and measures the booking from start to close', () => {
    expect(courtWindowPreview({ ...window, start: at(21, 30), end: at(22, 30) })).toEqual({
      opensAt: at(21, 30),
      closesAt: at(22, 30),
      lengthMin: 60,
      opensInMin: 558,
      nextDay: false,
    })
  })
  it.each([at(18), at(19)])('has no opening countdown at or after opening', (now) => {
    expect(courtWindowPreview({ ...window, start: at(18), end: at(21), now })).toMatchObject({
      opensInMin: null,
      lengthMin: 180,
    })
  })
  it('uses the session end for a following court', () => {
    expect(courtWindowPreview({ ...window, start: at(18), end: null })).toMatchObject({
      closesAt: at(23),
      lengthMin: 300,
    })
  })
  it.each([
    { start: at(21, 30), end: at(22, 30), sessionEnd: at(21) },
    { start: at(20), end: at(20) },
    { start: at(20), end: at(19) },
    { start: at(17), end: at(20) },
    { start: NaN, end: at(20) },
  ])('returns submit validation instead of a successful preview: %j', (values) => {
    const input = { ...window, ...values }
    expect(courtWindowPreview(input)).toEqual({
      error: courtWindowError(input.start, input.end, input.sessionStart, input.sessionEnd),
    })
  })
  it('identifies the reported after-session window before submission', () => {
    expect(
      courtWindowPreview({ ...window, sessionEnd: at(21), start: at(21, 30), end: at(22, 30) }),
    ).toEqual({ error: expect.stringContaining("That's after the session ends at") })
  })
  it('places an overnight window on the next day', () => {
    const sessionStart = at(22),
      sessionEnd = at(2, 0, 2)
    const start = at(23, 30)
    const end = at(0, 30, 2)
    expect(courtWindowPreview({ sessionStart, sessionEnd, start, end, now: at(23) })).toEqual({
      opensAt: start,
      closesAt: end,
      lengthMin: 60,
      opensInMin: 30,
      nextDay: true,
    })
  })
  it('snaps a start in the session start minute to the actual start', () => {
    expect(courtTimeOnSession(at(12, 6) + 34567, at(12, 6))).toBe(at(12, 6) + 34567)
  })
  it('leaves any other instant as it is, on whatever day it carries', () => {
    expect(courtTimeOnSession(at(22), at(21, 59))).toBe(at(21, 59))
    expect(courtTimeOnSession(at(22), at(0, 30, 2))).toBe(at(0, 30, 2))
  })
  it('accepts bookings between an early actual start and the scheduled start', () => {
    expect(
      courtWindowPreview({ ...window, sessionStart: at(12, 6), start: at(13), end: at(14) }),
    ).toMatchObject({ lengthMin: 60, opensInMin: 48 })
  })
  it('preserves advisory past endings without wrapping their duration to tomorrow', () => {
    expect(
      courtWindowPreview({ ...window, start: at(18), end: at(19), now: at(20) }),
    ).toMatchObject({ lengthMin: 60, opensInMin: null })
  })
})

describe('court window rules on full instants', () => {
  const sessionStart = at(22),
    sessionEnd = at(2, 0, 2)
  it('accepts a court that opens the next day within an overnight session', () => {
    expect(courtWindowError(at(0, 30, 2), at(1, 30, 2), sessionStart, sessionEnd)).toBeNull()
  })
  it('rejects a start before the session start, even at the same clock time on another day', () => {
    expect(courtWindowError(at(23), null, at(23, 0, 2), at(3, 0, 3))).toBe(
      'Choose a planned start within the session.',
    )
  })
  it('rejects a start at or after the session end', () => {
    expect(courtWindowError(sessionEnd, null, sessionStart, sessionEnd)).toBe(
      'Choose a planned start within the session.',
    )
  })
  it('rejects an end at or before its start', () => {
    expect(courtWindowError(at(23), at(23), sessionStart, sessionEnd)).toBe(
      'Choose an end after the planned start.',
    )
  })
  it('rejects an end after the session end', () => {
    expect(courtWindowError(at(23), at(3, 0, 2), sessionStart, sessionEnd)).toContain(
      "That's after the session ends at",
    )
  })
  it('marks only times on another calendar day as next day', () => {
    expect(courtNextDay(at(23, 59), sessionStart)).toBe(false)
    expect(courtNextDay(at(0, 0, 2), sessionStart)).toBe(true)
  })
})

describe('session window', () => {
  it('needs an end after the start', () => {
    expect(sessionWindowError(at(18), at(18))).toBe(SESSION_END_ERROR)
    expect(sessionWindowError(at(18), at(17))).toBe(SESSION_END_ERROR)
  })
  it('allows up to 24 hours and no more', () => {
    expect(sessionWindowError(at(18), at(18, 0, 2))).toBeNull()
    expect(sessionWindowError(at(18), at(18, 1, 2))).toBe(SESSION_END_ERROR)
  })
  it('accepts an overnight session given as instants', () => {
    expect(sessionWindowError(at(22), at(2, 0, 2))).toBeNull()
  })
  it('rejects invalid instants', () => {
    expect(sessionWindowError(Number.NaN, at(18))).toBe('Enter a date and time.')
  })
})

describe('clock-only bridge', () => {
  it('places a time on the given date without guessing the day', () => {
    expect(instantOnDate('2026-11-01', '18:30')).toBe(at(18, 30))
    expect(instantOnDate('2026-11-01', '')).toBeNaN()
    expect(instantOnDate('', '18:30')).toBeNaN()
  })
  it('takes the first matching clock time from an instant, the same minute included', () => {
    expect(clockTimeFrom(at(18), '18:00')).toBe(at(18))
    expect(clockTimeFrom(at(18) + 34567, '18:00')).toBe(at(18))
    expect(clockTimeFrom(at(18), '21:00')).toBe(at(21))
    expect(clockTimeFrom(at(22), '00:30')).toBe(at(0, 30, 2))
    expect(clockTimeFrom(at(18), 'nope')).toBeNaN()
  })
})
