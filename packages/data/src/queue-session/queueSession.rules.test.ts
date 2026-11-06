import { describe, expect, it } from 'vitest'
import {
  CANCEL_REASON_MAX,
  cancelBlocker,
  cancelReasonError,
  cancelReasonOf,
  countsForClash,
  sessionOccurrences,
} from './queueSession.rules'
import type { QueueSession } from './queueSession.types'

const start = new Date(2026, 10, 20, 19).getTime()
const other = (state: QueueSession['state']) =>
  ({
    id: 'other',
    title: 'Friday Night',
    state,
    venueId: 'venue-1',
    venueName: 'Lahug Courts',
    scheduledStartAt: start,
    scheduledEndAt: start + 3 * 3600000,
  }) as QueueSession
const draft = { scheduledStartAt: start, scheduledEndAt: start + 2 * 3600000, venueId: 'venue-1' }

describe('clashes', () => {
  it('ignores invalid and cancelled sessions and counts every other state', () => {
    expect(countsForClash({ state: 'invalid' })).toBe(false)
    expect(countsForClash({ state: 'cancelled' })).toBe(false)
    for (const state of ['prepared', 'active', 'finalizing', 'completed'] as const)
      expect(countsForClash({ state })).toBe(true)
  })

  it('lets a new session take the time of a cancelled one', () => {
    expect(sessionOccurrences(draft, [other('cancelled')])[0]?.clash).toBeNull()
    expect(sessionOccurrences(draft, [other('prepared')])[0]?.clash?.kind).toBe('venue')
  })
})

describe('Cancel session', () => {
  it('runs only before Start session; an already cancelled session is a repeat, not a blocker', () => {
    expect(cancelBlocker({ state: 'prepared' })).toBeNull()
    expect(cancelBlocker({ state: 'cancelled' })).toBeNull()
    for (const state of ['active', 'finalizing', 'completed', 'invalid'] as const)
      expect(cancelBlocker({ state })).toBe('Only a session that has not started can be cancelled.')
  })

  it('trims the optional reason and caps it at 120 characters', () => {
    expect(cancelReasonOf('  Not enough players ')).toBe('Not enough players')
    expect(cancelReasonOf('   ')).toBeNull()
    expect(cancelReasonOf(undefined)).toBeNull()
    expect(cancelReasonError('x'.repeat(CANCEL_REASON_MAX))).toBeNull()
    expect(cancelReasonError(` ${'x'.repeat(CANCEL_REASON_MAX)} `)).toBeNull()
    expect(cancelReasonError('x'.repeat(CANCEL_REASON_MAX + 1))).toMatch('120 characters')
  })
})
