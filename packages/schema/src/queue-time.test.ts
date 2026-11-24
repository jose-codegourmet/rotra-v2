import { describe, expect, it } from 'vitest'
import {
  elapsedTime,
  LONG_TIME_AGO,
  plannedEndPassed,
  queueTime,
  startedAgo,
  waitPhrase,
} from './queue-time'

describe('queueTime (Correct Queue Time Format)', () => {
  it.each([
    [0, '0 min'],
    [1, '1 min'],
    [59, '59 min'],
    [60, '1 h'],
    [61, '1 h'],
    [119, '1 h'],
    [120, '2 h'],
    [1439, '23 h'],
    [1440, LONG_TIME_AGO],
    [3000, LONG_TIME_AGO],
  ])('%i minutes reads %s', (minutes, text) => {
    expect(queueTime(minutes)).toBe(text)
  })

  it('floors fractions and treats negative or NaN as 0', () => {
    expect(queueTime(59.9)).toBe('59 min')
    expect(queueTime(-5)).toBe('0 min')
    expect(queueTime(Number.NaN)).toBe('0 min')
  })
})

describe('phrases built on queueTime', () => {
  it('waits keep "wait" until the time becomes "long time ago"', () => {
    expect(waitPhrase(45)).toBe('45 min wait')
    expect(waitPhrase(120)).toBe('2 h wait')
    expect(waitPhrase(1800)).toBe('long time ago')
  })

  it('elapsed match time reads "started long time ago" from 24 hours', () => {
    expect(elapsedTime(120)).toBe('2 h')
    expect(elapsedTime(1800)).toBe('started long time ago')
  })

  it('planned end passed', () => {
    expect(plannedEndPassed(15)).toBe('Planned end passed 15 min ago')
    expect(plannedEndPassed(180)).toBe('Planned end passed 3 h ago')
    expect(plannedEndPassed(1800)).toBe('Planned end passed long time ago')
  })

  it('substitution hint', () => {
    expect(startedAgo(5)).toBe('Started 5 min ago')
    expect(startedAgo(1500)).toBe('Started long time ago')
  })
})
