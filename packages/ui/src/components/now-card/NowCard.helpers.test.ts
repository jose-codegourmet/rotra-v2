import { describe, expect, it } from 'vitest'
import {
  clubDayDiff,
  formatTime,
  formatTimeRange,
  formatWhen,
  formatWhenRange,
} from './NowCard.helpers'

/** Instant for a wall-clock time in Asia/Manila (UTC+08, no DST). */
const manila = (local: string) => Date.parse(`${local}+08:00`)

const NOW = manila('2026-11-06T16:00:00')

describe('formatTime', () => {
  it('prints the clock in Asia/Manila, not UTC', () => {
    expect(formatTime(manila('2026-11-06T21:00:00'))).toBe('9:00 PM')
    // 16:00 UTC is 00:00 the next day in Manila
    expect(formatTime(Date.parse('2026-11-06T16:00:00Z'))).toBe('12:00 AM')
  })
})

describe('formatWhen', () => {
  it('is a plain time today, including midnight', () => {
    expect(formatWhen(manila('2026-11-06T21:00:00'), NOW)).toBe('9:00 PM')
    expect(formatWhen(manila('2026-11-06T00:00:00'), NOW)).toBe('12:00 AM')
    expect(formatWhen(manila('2026-11-06T23:59:00'), NOW)).toBe('11:59 PM')
  })

  it('names yesterday and tomorrow, lower-case mid-sentence', () => {
    expect(formatWhen(manila('2026-11-05T22:42:00'), NOW)).toBe('Yesterday 10:42 PM')
    expect(formatWhen(manila('2026-11-07T19:00:00'), NOW)).toBe('Tomorrow 7:00 PM')
    expect(formatWhen(manila('2026-11-05T22:42:00'), NOW, { lower: true })).toBe(
      'yesterday 10:42 PM',
    )
    expect(formatWhen(manila('2026-11-07T19:00:00'), NOW, { lower: true })).toBe('tomorrow 7:00 PM')
  })

  it('uses the short date further away', () => {
    expect(formatWhen(manila('2025-11-01T21:00:00'), NOW)).toBe('Sat, Nov 1 · 9:00 PM')
  })

  it('splits days on Manila midnight, not UTC midnight', () => {
    const justAfterManilaMidnight = manila('2026-11-06T00:30:00')
    const utcWouldStillBeNov5 = Date.parse('2026-11-05T16:30:00Z')
    expect(justAfterManilaMidnight).toBe(utcWouldStillBeNov5)
    expect(formatWhen(justAfterManilaMidnight, NOW)).toBe('12:30 AM')
    expect(formatWhen(manila('2026-11-05T23:30:00'), NOW)).toBe('Yesterday 11:30 PM')
  })
})

describe('formatTimeRange', () => {
  it('marks an end on the next club day', () => {
    expect(formatTimeRange(manila('2026-11-06T19:00:00'), manila('2026-11-07T01:00:00'))).toBe(
      '7:00 PM–1:00 AM · next day',
    )
  })

  it('stays a plain range when both ends are the same club day', () => {
    expect(formatTimeRange(manila('2026-11-06T18:00:00'), manila('2026-11-06T21:00:00'))).toBe(
      '6:00 PM–9:00 PM',
    )
  })
})

describe('formatWhenRange', () => {
  it('puts the day on the start and next day on the end', () => {
    expect(
      formatWhenRange(manila('2026-11-05T22:42:00'), manila('2026-11-06T01:00:00'), NOW, {
        lower: true,
      }),
    ).toBe('yesterday 10:42 PM–1:00 AM · next day')
  })
})

describe('clubDayDiff', () => {
  it('is 0 across UTC midnight while still the same Manila day', () => {
    expect(clubDayDiff(manila('2026-11-06T07:00:00'), manila('2026-11-06T09:00:00'))).toBe(0)
    expect(clubDayDiff(NOW, manila('2026-11-07T00:00:00'))).toBe(1)
    expect(clubDayDiff(NOW, manila('2026-11-05T23:59:00'))).toBe(-1)
  })
})
