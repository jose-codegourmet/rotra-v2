import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeviceDownloads } from '../device/fetchers'
import { createCourtWindowFixtures } from '../fixtures/consoleSessions'
import { connectMockBridge, DEFAULT_DEV_STATE } from '../mock/bridge'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { markAllPaid } from '../session-payment/fetchers'
import type { SessionJoinRequest } from '../session-roster/sessionRoster.types'
import { cancelSession } from './mutations'

const fixture = createCourtWindowFixtures(),
  sessionId = fixture.session.id,
  now = fixture.session.scheduledStartAt - 86400000
const request = (id: string, status: SessionJoinRequest['status']): SessionJoinRequest => ({
  id,
  sessionId,
  name: `Guest ${id}`,
  nickname: null,
  phoneE164: null,
  statedBand: 'unsure',
  placement: 'slot',
  status,
  requestedAt: now - 3600000,
  decidedAt: status === 'pending' ? null : now - 1800000,
  clubPlayerId: null,
})
let restoreLatency: () => void
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  vi.spyOn(Date, 'now').mockReturnValue(now)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [{ ...fixture.session, state: 'prepared', startedAt: null }]
    s.roster = fixture.roster
    s.courts = structuredClone(fixture.courts)
    s.matches = []
    s.joinRequests = [request('a', 'pending'), request('b', 'declined'), request('c', 'pending')]
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  restoreLatency()
})
const session = () => readMockState().sessions.find((s) => s.id === sessionId)!

describe('cancelSession', () => {
  it('cancels a prepared session, records when and why, and closes pending join requests', async () => {
    const roster = structuredClone(readMockState().roster)
    const result = await cancelSession({ sessionId, reason: '  Not enough players ' })
    expect(result.message).toContain(`${fixture.session.title} cancelled`)
    expect(session()).toMatchObject({
      state: 'cancelled',
      cancelledAt: now,
      cancelReason: 'Not enough players',
    })
    expect(readMockState().joinRequests.map((r) => [r.id, r.status, r.decidedAt])).toEqual([
      ['a', 'closed', now],
      ['b', 'declined', now - 1800000],
      ['c', 'closed', now],
    ])
    expect(readMockState().roster).toEqual(roster)
  })

  it('is repeat-safe: a retry returns the cancelled session without another change', async () => {
    await cancelSession({ sessionId })
    const logs = readMockState().sync.log.length
    const retry = await cancelSession({ sessionId, reason: 'Another reason' })
    expect(retry.data).toMatchObject({ state: 'cancelled', cancelReason: null })
    expect(readMockState().sync.log).toHaveLength(logs)
  })

  it('refuses a started session, a long reason and an offline device, changing nothing', async () => {
    const before = structuredClone(readMockState())
    await expect(cancelSession({ sessionId, reason: 'x'.repeat(121) })).rejects.toThrow(
      '120 characters',
    )
    const disconnect = connectMockBridge({
      read: () => ({ ...DEFAULT_DEV_STATE, offline: true }),
      consume: () => {},
    })
    try {
      await expect(cancelSession({ sessionId })).rejects.toThrow("You're offline")
    } finally {
      disconnect()
    }
    expect(readMockState()).toEqual(before)
    mockStore.update((s) => {
      s.sessions[0]!.state = 'active'
    })
    await expect(cancelSession({ sessionId })).rejects.toThrow('has not started')
    expect(session().state).toBe('active')
  })

  it('leaves the session out of downloads and refuses payment marks', async () => {
    await cancelSession({ sessionId })
    expect((await getDeviceDownloads()).map((d) => d.sessionId)).not.toContain(sessionId)
    await expect(markAllPaid(sessionId)).rejects.toThrow(
      'Payments are not available for this session.',
    )
  })
})
