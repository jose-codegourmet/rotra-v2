import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCourtWindowFixtures } from '../fixtures/consoleSessions'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { extendSession, setSessionEnd } from './courts'
import { startSession } from './mutations'
import {
  atWhenLabel,
  clubTimeLabel,
  END_AFTER_NOW_ERROR,
  END_WITHIN_DAY_ERROR,
  START_NEEDS_NEW_END,
  sessionEndCourtConflict,
  sessionEndError,
  startBlocker,
  startNeedsNewEnd,
  startNewEndError,
  whenLabel,
} from './queueSession.rules'
import type { QueueSession } from './queueSession.types'

const HOUR = 3_600_000
/** 6:00 PM on Nov 5, 2026 in the club zone (Asia/Manila, UTC+8). */
const plannedStart = Date.UTC(2026, 10, 5, 10)
const plannedEnd = plannedStart + 3 * HOUR

describe('late or other-day start (T3)', () => {
  it('needs a new end after the planned end or on another club day', () => {
    expect(startNeedsNewEnd(plannedStart, plannedEnd, plannedStart - HOUR)).toBe(false)
    expect(startNeedsNewEnd(plannedStart, plannedEnd, plannedEnd)).toBe(false)
    expect(startNeedsNewEnd(plannedStart, plannedEnd, plannedEnd + 1)).toBe(true)
    // The next evening, before the planned clock time: still another day.
    expect(startNeedsNewEnd(plannedStart, plannedEnd, plannedStart + 23 * HOUR)).toBe(true)
    // Planned for tomorrow, started early today.
    expect(startNeedsNewEnd(plannedStart, plannedEnd, plannedStart - 20 * HOUR)).toBe(true)
  })

  it('requires the new end only when needed, after now and within 24 hours', () => {
    const base = { scheduledStartAt: plannedStart, scheduledEndAt: plannedEnd }
    expect(startNewEndError({ ...base, newEndAt: null, now: plannedStart })).toBeNull()
    const now = plannedStart + 26 * HOUR
    expect(startNewEndError({ ...base, newEndAt: null, now })).toBe(START_NEEDS_NEW_END)
    expect(startNewEndError({ ...base, newEndAt: now, now })).toBe(END_AFTER_NOW_ERROR)
    expect(startNewEndError({ ...base, newEndAt: now + 24 * HOUR + 1, now })).toBe(
      END_WITHIN_DAY_ERROR,
    )
    expect(startNewEndError({ ...base, newEndAt: now + 24 * HOUR, now })).toBeNull()
    expect(startNewEndError({ ...base, newEndAt: now + 3 * HOUR, now })).toBeNull()
  })

  it('startBlocker checks the new end only when the command passes now', () => {
    const session = {
      id: 's',
      clubId: 'club',
      state: 'prepared',
      scheduledStartAt: plannedStart,
      scheduledEndAt: plannedEnd,
    } as QueueSession
    const ctx = {
      sessions: [session],
      roster: [],
      licenseExpired: false,
      offline: false,
      downloaded: false,
    }
    const now = plannedEnd + HOUR
    expect(startBlocker(session, ctx)).toBeNull()
    expect(startBlocker(session, { ...ctx, now })).toBe(START_NEEDS_NEW_END)
    expect(startBlocker(session, { ...ctx, now, newEndAt: now + HOUR })).toBeNull()
  })
})

describe('Set end time rule (T2)', () => {
  const startedAt = plannedStart + 5 * 60_000
  const now = startedAt + HOUR
  const court = (label: string, startsAt?: number, openUntil: number | null = null) => ({
    label,
    startsAt,
    openUntil,
    removedAt: null,
  })
  const live = (endAt: number, courts = [court('Court 1')]) =>
    sessionEndError({ startedAt, scheduledStartAt: plannedStart, endAt, now, courts })

  it('takes any time after now, later or earlier, up to 24 hours after play began', () => {
    expect(live(now)).toBe(END_AFTER_NOW_ERROR)
    expect(live(now + 60_000)).toBeNull()
    expect(live(plannedEnd - HOUR)).toBeNull()
    expect(live(startedAt + 24 * HOUR)).toBeNull()
    expect(live(startedAt + 24 * HOUR + 1)).toBe(END_WITHIN_DAY_ERROR)
  })

  it('uses the setup window before the session starts', () => {
    const prepared = (endAt: number) =>
      sessionEndError({ startedAt: null, scheduledStartAt: plannedStart, endAt, now, courts: [] })
    expect(prepared(plannedStart)).toBe('Choose an end after the start.')
    expect(prepared(plannedStart + 24 * HOUR + 1)).toBe('Choose an end after the start.')
    expect(prepared(plannedStart + 4 * HOUR)).toBeNull()
  })

  it('is blocked by a court that opens at or after the new end', () => {
    const opensAt = startedAt + 3 * HOUR
    expect(live(opensAt, [court('Court 3', opensAt)])).toBe(
      `Court 3 opens ${atWhenLabel(opensAt, now)}. Pick a later end, or edit that court first.`,
    )
    expect(live(opensAt + 1, [court('Court 3', opensAt)])).toBeNull()
  })

  it('is blocked by a court booked past the new end; courts that follow the end move with it', () => {
    const until = startedAt + 4 * HOUR
    expect(live(until - HOUR, [court('Court 2', undefined, until)])).toBe(
      `Court 2 is booked until ${whenLabel(until, now)}. Pick a later end, or edit that court first.`,
    )
    expect(live(until, [court('Court 2', undefined, until)])).toBeNull()
    expect(live(now + 60_000, [court('Court 1'), court('Court 4', startedAt)])).toBeNull()
  })

  it('ignores removed courts', () => {
    const opensAt = startedAt + 3 * HOUR
    expect(
      sessionEndCourtConflict(
        [{ label: 'Court 3', startsAt: opensAt, openUntil: null, removedAt: now }],
        opensAt - HOUR,
        startedAt,
        now,
      ),
    ).toBeNull()
  })

  it('says the day when the time is not today', () => {
    expect(atWhenLabel(now, now)).toBe(`at ${clubTimeLabel(now)}`)
    expect(whenLabel(now + 24 * HOUR, now)).toBe(`tomorrow ${clubTimeLabel(now)}`)
    expect(whenLabel(now - 24 * HOUR, now)).toBe(`yesterday ${clubTimeLabel(now)}`)
  })
})

describe('mock commands', () => {
  const fixture = createCourtWindowFixtures(),
    sessionId = fixture.session.id,
    start = fixture.session.scheduledStartAt,
    end = fixture.session.scheduledEndAt
  let restoreLatency: () => void
  const setClock = (at: number) => vi.spyOn(Date, 'now').mockReturnValue(at)
  const load = (session: Partial<QueueSession> = {}) =>
    mockStore.update((s) => {
      s.sessions = [{ ...fixture.session, ...session }]
      s.roster = fixture.roster
      s.courts = structuredClone(fixture.courts)
      s.matches = []
    })
  const saved = () => readMockState().sessions.find((s) => s.id === sessionId)!
  beforeEach(() => {
    restoreLatency = setMockLatencyEnabled(false)
    mockStore.reset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    restoreLatency()
  })

  it('sets an earlier end; courts that follow the end move with it; start stays fixed', async () => {
    setClock(start + 30 * 60_000)
    load()
    // Court 5 is booked until start + 2 h; Courts 4–5 open at start + 1 h.
    const result = await setSessionEnd({ sessionId, endAt: start + 2 * HOUR })
    expect(result.message).toMatch(/^Session ends .* · public page updates after sync/)
    expect(saved().scheduledEndAt).toBe(start + 2 * HOUR)
    expect(saved().startedAt).toBe(start)
    expect(readMockState().courts.find((c) => c.label === 'Court 1')!.openUntil).toBeNull()
  })

  it('refuses each conflict and a time not after now', async () => {
    const now = start + 30 * 60_000
    setClock(now)
    load()
    await expect(setSessionEnd({ sessionId, endAt: now })).rejects.toThrow(END_AFTER_NOW_ERROR)
    await expect(setSessionEnd({ sessionId, endAt: start + HOUR })).rejects.toThrow(
      `Court 4 opens ${atWhenLabel(start + HOUR, now)}. Pick a later end, or edit that court first.`,
    )
    await expect(setSessionEnd({ sessionId, endAt: start + 90 * 60_000 })).rejects.toThrow(
      `Court 5 is booked until ${whenLabel(start + 2 * HOUR, now)}.`,
    )
    await expect(setSessionEnd({ sessionId, endAt: start + 24 * HOUR + 1 })).rejects.toThrow(
      END_WITHIN_DAY_ERROR,
    )
    expect(saved().scheduledEndAt).toBe(end)
  })

  it('Extend 30 / 60 run the same rule on the current end', async () => {
    setClock(start + 30 * 60_000)
    load()
    await extendSession({ sessionId, minutes: 30 })
    expect(saved().scheduledEndAt).toBe(end + 30 * 60_000)
    // Overdue by two hours: end + 60 min is still before now.
    setClock(end + 30 * 60_000 + 2 * HOUR)
    await expect(extendSession({ sessionId, minutes: 60 })).rejects.toThrow(END_AFTER_NOW_ERROR)
  })

  it('starts a session planned yesterday only with a new end, and saves it', async () => {
    const now = start + 24 * HOUR + 30 * 60_000
    setClock(now)
    load({ state: 'prepared', startedAt: null })
    // Courts 4–5 keep their own planned start (yesterday) and Court 5 its booking (yesterday).
    await expect(startSession(sessionId)).rejects.toThrow(START_NEEDS_NEW_END)
    await expect(startSession({ sessionId, newEndAt: now })).rejects.toThrow(END_AFTER_NOW_ERROR)
    const newEndAt = now + 3 * HOUR
    const result = await startSession({ sessionId, newEndAt })
    expect(result.message).toMatch(/^Session started · levels locked · ends /)
    expect(saved()).toMatchObject({ state: 'active', startedAt: now, scheduledEndAt: newEndAt })
  })

  it('keeps the planned end on an on-time start', async () => {
    setClock(start)
    load({ state: 'prepared', startedAt: null })
    const result = await startSession({ sessionId, newEndAt: start + HOUR })
    expect(result.message).toMatch(/^Session started · levels locked/)
    expect(saved()).toMatchObject({ state: 'active', scheduledEndAt: end })
  })
})
