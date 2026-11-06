import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCourtWindowFixtures } from '../fixtures/consoleSessions'
import { canStart, courtOpen, freeCourts, type MatchContext } from '../match/match.rules'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  openAllCourtsEarly,
  openCourtEarly,
  removeCourt,
  undoCourtEarlyOpen,
  updateCourt,
} from './courts'
import { sessionSummary } from './fetchers'

const fixture = createCourtWindowFixtures(),
  sessionId = fixture.session.id,
  start = fixture.session.scheduledStartAt,
  court4 = fixture.courts[3]!,
  court5 = fixture.courts[4]!
let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  // Courts 1–3 open at the session start; Courts 4–5 an hour later.
  vi.spyOn(Date, 'now').mockReturnValue(start)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [fixture.session]
    s.roster = fixture.roster
    s.courts = structuredClone(fixture.courts)
    s.matches = []
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  restoreLatency()
})
const courtIn = (id: string) => readMockState().courts.find((c) => c.id === id)!
const logLength = () => readMockState().sync.log.length

describe('Start anyway', () => {
  it('treats an early-opened court as open and free before its planned start', () => {
    const early = fixture.courts.map((c) =>
      c.id === court4.id ? { ...c, openedEarlyAt: start } : c,
    )
    expect(freeCourts(fixture.courts, [], start)).toHaveLength(3)
    expect(freeCourts(early, [], start)).toHaveLength(4)
    expect(courtOpen({ ...court4, openedEarlyAt: start + 1 }, start)).toBe(false)
  })

  it('opens one court early, keeps its booking, logs once and fixes its start', async () => {
    const before = logLength()
    const result = await openCourtEarly({ sessionId, courtId: court4.id })
    expect(result.message).toMatch(/^Court 4 opened early · planned /)
    expect(courtIn(court4.id)).toMatchObject({ startsAt: court4.startsAt, openedEarlyAt: start })
    expect(logLength()).toBe(before + 1)
    expect(readMockState().sync.log[0]!.area).toBe('Courts and time')
    expect(freeCourts(readMockState().courts, [], start).map((c) => c.id)).toContain(court4.id)
    await expect(
      updateCourt({
        sessionId,
        courtId: court4.id,
        label: court4.label,
        startsAt: court4.startsAt! + 60000,
        openUntil: null,
      }),
    ).rejects.toThrow('fixed after use')
  })

  it('refuses an open, removed or read-only court and changes nothing', async () => {
    await expect(openCourtEarly({ sessionId, courtId: fixture.courts[0]!.id })).rejects.toThrow(
      'Something changed',
    )
    await removeCourt({ sessionId, courtId: court5.id })
    await expect(openCourtEarly({ sessionId, courtId: court5.id })).rejects.toThrow(
      'Something changed',
    )
    mockStore.update((s) => {
      s.sessions[0]!.state = 'invalid'
    })
    const before = structuredClone(readMockState().courts),
      logs = logLength()
    await expect(openCourtEarly({ sessionId, courtId: court4.id })).rejects.toThrow()
    expect(readMockState().courts).toEqual(before)
    expect(logLength()).toBe(logs)
  })

  it('opens every not-yet-open court in one change and lets a 5v5 start on them', async () => {
    const before = logLength()
    const result = await openAllCourtsEarly({ sessionId })
    expect(result.message).toBe('2 courts opened early')
    expect(logLength()).toBe(before + 1)
    const ids = fixture.roster
      .filter((p) => p.present)
      .slice(0, 10)
      .map((p) => p.id)
    const match = {
      id: 'early-5v5',
      sessionId,
      matchNo: 1,
      state: 'waiting' as const,
      format: 'fun_5v5' as const,
      queuePosition: 1,
      origin: 'manual' as const,
      manualProtected: true,
      teamA: ids.slice(0, 5),
      teamB: ids.slice(5),
      courtIds: [],
      startedAt: null,
      endedAt: null,
      substitutions: [],
      decision: null,
    }
    const ctx: MatchContext = {
      roster: fixture.roster,
      matches: [match],
      courts: readMockState().courts,
      now: start,
    }
    expect(canStart(match, [court4.id, court5.id], ctx)).toBe(true)
    await expect(openAllCourtsEarly({ sessionId })).rejects.toThrow('Something changed')
  })

  it('leaves capacity alone', async () => {
    const summary = () => sessionSummary(readMockState(), readMockState().sessions[0]!).capacity
    const capacity = summary()
    await openAllCourtsEarly({ sessionId })
    expect(summary()).toBe(capacity)
  })

  it('undoes an early open only while the court is free', async () => {
    await openCourtEarly({ sessionId, courtId: court4.id })
    mockStore.update((s) => {
      s.matches.push({
        id: 'on-court-4',
        sessionId,
        matchNo: 1,
        state: 'active',
        format: 'doubles',
        queuePosition: 1,
        origin: 'manual',
        manualProtected: true,
        teamA: [],
        teamB: [],
        courtIds: [court4.id],
        startedAt: start,
        endedAt: null,
        substitutions: [],
        decision: null,
      })
    })
    await expect(undoCourtEarlyOpen({ sessionId, courtId: court4.id })).rejects.toThrow(
      'Only a free court',
    )
    mockStore.update((s) => {
      s.matches = []
    })
    const result = await undoCourtEarlyOpen({ sessionId, courtId: court4.id })
    expect(result.message).toMatch(/^Court 4 back to Not open yet · opens /)
    expect(courtIn(court4.id)).toMatchObject({ startsAt: court4.startsAt, openedEarlyAt: null })
    expect(freeCourts(readMockState().courts, [], start)).toHaveLength(3)
    await expect(undoCourtEarlyOpen({ sessionId, courtId: court4.id })).rejects.toThrow(
      'Something changed',
    )
  })

  it('treats an On court match as holding its court for Undo early open and Remove', async () => {
    await openCourtEarly({ sessionId, courtId: court4.id })
    mockStore.update((s) => {
      s.matches.push({
        id: 'placed-4',
        sessionId,
        matchNo: 1,
        state: 'on_court',
        format: 'doubles',
        queuePosition: 1,
        origin: 'manual',
        manualProtected: true,
        teamA: [],
        teamB: [],
        courtIds: [court4.id],
        placedAt: start,
        startedAt: null,
        endedAt: null,
        substitutions: [],
        decision: null,
      })
    })
    await expect(undoCourtEarlyOpen({ sessionId, courtId: court4.id })).rejects.toThrow(
      'Only a free court',
    )
    await expect(removeCourt({ sessionId, courtId: court4.id })).rejects.toThrow(
      'Only a free court',
    )
    expect(courtIn(court4.id)).toMatchObject({ openedEarlyAt: start, removedAt: null })
  })
})
