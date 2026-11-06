import { describe, expect, it } from 'vitest'
import { isEnterSubmitTarget, sessionTimes, setupSubmitAction } from './SessionSetupForm.helpers'

describe('setupSubmitAction', () => {
  it('acts as Next on pages 1 and 2 and saves only on page 3', () => {
    expect(setupSubmitAction(0, 2)).toBe('next')
    expect(setupSubmitAction(1, 2)).toBe('next')
    expect(setupSubmitAction(2, 2)).toBe('save')
  })
})

describe('isEnterSubmitTarget', () => {
  it('treats text-like inputs as Enter targets', () => {
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'text' })).toBe(true)
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'number' })).toBe(true)
    expect(isEnterSubmitTarget({ tagName: 'INPUT' })).toBe(true)
  })

  it('ignores buttons, toggles, text areas and empty targets', () => {
    expect(isEnterSubmitTarget({ tagName: 'INPUT', type: 'checkbox' })).toBe(false)
    expect(isEnterSubmitTarget({ tagName: 'BUTTON', type: 'button' })).toBe(false)
    expect(isEnterSubmitTarget({ tagName: 'TEXTAREA' })).toBe(false)
    expect(isEnterSubmitTarget(null)).toBe(false)
  })
})

describe('sessionTimes', () => {
  const at = (hour: number, minute = 0, day = 6) => new Date(2026, 10, day, hour, minute).getTime()
  const base = { date: '2026-11-06', courtLabels: ['Court 1', 'Court 2'] }

  it('returns full instants, with empty court times following the session', () => {
    const values = { ...base, startTime: '18:00', endTime: '21:00', courtStarts: [] }
    expect(sessionTimes(values)).toEqual({
      start: at(18),
      end: at(21),
      courts: [
        { startsAt: at(18), openUntil: null },
        { startsAt: at(18), openUntil: null },
      ],
    })
  })

  it('puts an overnight end and a court opening after midnight on the next day', () => {
    const times = sessionTimes({
      ...base,
      startTime: '22:00',
      endTime: '02:00',
      courtStarts: ['', '00:30'],
      courtEnds: ['23:30', '01:30'],
    })
    expect(times.end).toBe(at(2, 0, 7))
    expect(times.courts).toEqual([
      { startsAt: at(22), openUntil: at(23, 30) },
      { startsAt: at(0, 30, 7), openUntil: at(1, 30, 7) },
    ])
  })

  it('reads an end equal to the start as 24 hours later', () => {
    const { start, end } = sessionTimes({ ...base, startTime: '18:00', endTime: '18:00' })
    expect(end - start).toBe(864e5)
  })

  it('gives NaN instants for a missing date instead of guessing one', () => {
    expect(sessionTimes({ date: '', startTime: '18:00', endTime: '21:00' }).start).toBeNaN()
  })
})
