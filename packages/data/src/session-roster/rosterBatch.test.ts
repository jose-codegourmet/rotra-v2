import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushSessionRoster } from '../batch/flushBatches'
import { connectMockBridge, DEFAULT_DEV_STATE } from '../mock/bridge'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { getQueueSession } from '../queue-session/fetchers'
import { queueSessionKeys } from '../queue-session/queryKeys'
import { ROSTER_DUPLICATE_ERROR } from './sessionRoster.rules'
import {
  enqueueAcceptRequest,
  enqueueAddNewPlayer,
  enqueueAddSavedPlayer,
  enqueueDeclineRequest,
  enqueueRemoveRosterPlayer,
} from './enqueueRosterOps'
import { getSessionRoster } from './fetchers'
import { sessionRosterKeys } from './queryKeys'
import { getRosterBatch, overlayRoster, type PendingRosterOp, readRosterView } from './rosterBatch'

let restoreLatency: () => void
let disconnect: (() => void) | undefined
let client: QueryClient

/** A prepared session with open slots, a pending join request and saved players not on it. */
function scene() {
  const s = readMockState()
  const request = s.joinRequests.find((r) => r.status === 'pending' && r.placement === 'slot')
  if (!request) throw new Error('Pending join request fixture missing')
  const session = s.sessions.find((x) => x.id === request.sessionId)
  if (!session) throw new Error('Session fixture missing')
  const inSession = new Set([
    ...s.roster.filter((r) => r.sessionId === session.id).map((r) => r.clubPlayerId),
    ...s.waitlist.filter((w) => w.sessionId === session.id).map((w) => w.clubPlayerId),
  ])
  const free = s.clubPlayers.filter(
    (p) =>
      p.clubId === session.clubId &&
      !p.removedAt &&
      !p.linkedToClubPlayerId &&
      !inSession.has(p.id),
  )
  if (free.length < 2) throw new Error('Need two free saved players')
  return { sessionId: session.id, request, free }
}

async function prime(sessionId: string) {
  client.setQueryData(sessionRosterKeys.list(sessionId), await getSessionRoster(sessionId))
  client.setQueryData(queueSessionKeys.detail(sessionId), await getQueueSession(sessionId))
}

beforeEach(async () => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((s) => {
    const { sessionId } = scene()
    const session = s.sessions.find((x) => x.id === sessionId)
    if (session) session.state = 'prepared'
    // Plenty of courts: every add in these tests lands on the roster, not the waitlist.
    for (let i = 0; i < 4; i++)
      s.courts.push({
        id: `court-${i}`,
        sessionId,
        label: `Court ${i + 10}`,
        openUntil: null,
        removedAt: null,
      })
  })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(() => {
  disconnect?.()
  disconnect = undefined
  restoreLatency()
  client.clear()
})

describe('roster burst batch', () => {
  it('lays a pending add over the roster at once and settles it with one Roster sync entry', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    const before = readMockState()
    const { outcome } = enqueueAddSavedPlayer(client, {
      sessionId,
      clubPlayerId: free[0]!.id,
      level: 'intermediate_mid',
    })
    expect(outcome.message).toContain('added · Intermediate Mid')
    expect(
      readRosterView(client, sessionId)?.roster.some((r) => r.clubPlayerId === free[0]!.id),
    ).toBe(true)
    expect(readMockState().roster).toEqual(before.roster)
    await flushSessionRoster(sessionId)
    const after = readMockState()
    expect(
      after.roster.some((r) => r.sessionId === sessionId && r.clubPlayerId === free[0]!.id),
    ).toBe(true)
    expect(after.sync.log).toHaveLength(before.sync.log.length + 1)
    expect(getRosterBatch(client, sessionId).batch.pendingKeys().size).toBe(0)
  })

  it('sends one request per burst, in click order, after 800 ms without another tap', async () => {
    vi.useFakeTimers()
    try {
      const { sessionId, free, request } = scene()
      await prime(sessionId)
      const before = readMockState()
      enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
      await vi.advanceTimersByTimeAsync(300)
      enqueueAcceptRequest(client, { requestId: request.id, level: 'advanced_mid' })
      await vi.advanceTimersByTimeAsync(300)
      enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[1]!.id, level: 'beginner_mid' })
      await vi.advanceTimersByTimeAsync(799)
      expect(readMockState().sync.log).toHaveLength(before.sync.log.length)
      await vi.advanceTimersByTimeAsync(1)
      await flushSessionRoster(sessionId)
      const after = readMockState()
      expect(after.sync.log).toHaveLength(before.sync.log.length + 1)
      expect(after.sync.log[0]?.text).toBe('2 players added, 1 request confirmed')
      const added = after.roster
        .filter((r) => r.sessionId === sessionId && !before.roster.some((b) => b.id === r.id))
        .map((r) => r.nameSnapshot)
      expect(added).toEqual([free[0]!.fullName, request.name, free[1]!.fullName])
      expect(after.joinRequests.find((r) => r.id === request.id)?.status).toBe('confirmed')
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels an add removed in the same burst: nothing is sent for that player', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    const before = readMockState()
    const { outcome } = enqueueAddSavedPlayer(client, {
      sessionId,
      clubPlayerId: free[0]!.id,
      level: 'beginner_mid',
    })
    const row = readRosterView(client, sessionId)?.roster.find(
      (r) => r.clubPlayerId === outcome.data.clubPlayerId,
    )
    if (!row) throw new Error('Pending row missing')
    enqueueRemoveRosterPlayer(client, { sessionId, rosterId: row.id })
    expect(readRosterView(client, sessionId)?.roster.some((r) => r.id === row.id)).toBe(false)
    expect(getRosterBatch(client, sessionId).batch.pendingKeys().size).toBe(0)
    await flushSessionRoster(sessionId)
    expect(readMockState()).toEqual(before)
  })

  it('removes a row whose add is still in flight once that add has landed', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
    const temp = readRosterView(client, sessionId)?.roster.find(
      (r) => r.clubPlayerId === free[0]!.id,
    )?.id
    const shared = getRosterBatch(client, sessionId)
    const flushing = shared.batch.flush()
    // The row still shows under its temporary id while its burst is in flight.
    enqueueRemoveRosterPlayer(client, { sessionId, rosterId: temp! })
    await flushing
    expect(
      readMockState().roster.some(
        (r) => r.sessionId === sessionId && r.clubPlayerId === free[0]!.id,
      ),
    ).toBe(true)
    await flushSessionRoster(sessionId)
    expect(
      readMockState().roster.some(
        (r) => r.sessionId === sessionId && r.clubPlayerId === free[0]!.id,
      ),
    ).toBe(false)
    expect(shared.batch.pendingKeys().size).toBe(0)
  })

  it('sends the last decision when a request is accepted then declined in one burst', async () => {
    const { sessionId, request } = scene()
    await prime(sessionId)
    enqueueAcceptRequest(client, { requestId: request.id, level: 'advanced_mid' })
    expect(() => enqueueDeclineRequest(client, request.id)).toThrow(
      'This join request has already been decided.',
    )
    // A second decision reaches the batch only through the shared controller's key.
    const shared = getRosterBatch(client, sessionId)
    shared.enqueue({
      operation: { op: 'declineRequest', operationId: crypto.randomUUID(), requestId: request.id },
    })
    expect(shared.pendingOps()).toHaveLength(1)
    expect(shared.pendingOps()[0]?.operation.op).toBe('declineRequest')
    await flushSessionRoster(sessionId)
    const saved = readMockState()
    expect(saved.joinRequests.find((r) => r.id === request.id)?.status).toBe('declined')
    expect(saved.joinRequests.find((r) => r.id === request.id)?.clubPlayerId).toBeNull()
  })

  it('refuses a duplicate add at once, before anything is queued', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
    expect(() =>
      enqueueAddSavedPlayer(client, {
        sessionId,
        clubPlayerId: free[0]!.id,
        level: 'beginner_mid',
      }),
    ).toThrow(ROSTER_DUPLICATE_ERROR)
    expect(getRosterBatch(client, sessionId).pendingOps()).toHaveLength(1)
  })

  it('rolls the whole burst back on failure, keeps later taps and reports once', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    disconnect = connectMockBridge({
      consume: () => {},
      read: () => ({ ...DEFAULT_DEV_STATE, nextSaveFails: true }),
    })
    const before = readMockState()
    const shared = getRosterBatch(client, sessionId)
    const onError = vi.fn()
    shared.owner.callbacks = { onError }
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
    enqueueAddNewPlayer(client, { sessionId, name: 'Burst Guest', level: 'beginner_mid' })
    const flushing = shared.batch.flush()
    // A tap while the burst is in flight belongs to the next burst and survives the failure.
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[1]!.id, level: 'beginner_mid' })
    await flushing
    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe('Changes could not be saved')
    expect(readMockState()).toEqual(before)
    const view = readRosterView(client, sessionId)
    expect(view?.roster.some((r) => r.clubPlayerId === free[0]!.id)).toBe(false)
    expect(view?.roster.some((r) => r.nameSnapshot === 'Burst Guest')).toBe(false)
    expect(view?.roster.some((r) => r.clubPlayerId === free[1]!.id)).toBe(true)
    expect(shared.pendingOps()).toHaveLength(1)
  })

  it('refuses the burst offline without a downloaded copy and saves it offline with one', async () => {
    const { sessionId, free } = scene()
    await prime(sessionId)
    disconnect = connectMockBridge({
      consume: () => {},
      read: () => ({ ...DEFAULT_DEV_STATE, offline: true }),
    })
    const shared = getRosterBatch(client, sessionId)
    const onError = vi.fn()
    shared.owner.callbacks = { onError }
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
    await flushSessionRoster(sessionId)
    expect(onError).toHaveBeenCalledTimes(1)
    expect((onError.mock.calls[0]?.[0] as Error).message).toContain('No downloaded copy')
    mockStore.update((s) => {
      s.downloads[sessionId] = 'ready'
    })
    const onSuccess = vi.fn()
    shared.owner.callbacks = { onSuccess }
    enqueueAddSavedPlayer(client, { sessionId, clubPlayerId: free[0]!.id, level: 'beginner_mid' })
    await flushSessionRoster(sessionId)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess.mock.calls[0]?.[0].savedOffline).toBe(true)
  })
})

describe('overlayRoster', () => {
  const sessionId = 'session'
  const row = (id: string, clubPlayerId: string) => ({
    id,
    sessionId,
    clubPlayerId,
    nameSnapshot: id,
    nicknameSnapshot: null,
    present: false,
    presentChangedAt: null,
    level: 'beginner_mid' as const,
    levelLockedAt: null,
    confirmedAt: 1,
  })
  const request = {
    id: 'req',
    sessionId,
    name: 'Tracy',
    nickname: null,
    phoneE164: null,
    statedBand: 'unsure' as const,
    placement: 'slot' as const,
    status: 'pending' as const,
    requestedAt: 1,
    decidedAt: null,
    clubPlayerId: null,
  }
  const data = { roster: [row('a', 'pa'), row('b', 'pb')], waitlist: [], joinRequests: [request] }
  const add = (rosterId: string, clubPlayerId: string, toWaitlist = false): PendingRosterOp => ({
    operation: {
      op: 'add',
      operationId: rosterId,
      source: 'saved',
      clubPlayerId,
      level: 'beginner_mid',
    },
    preview: {
      rosterId,
      clubPlayerId,
      nameSnapshot: 'New',
      nicknameSnapshot: null,
      level: 'beginner_mid',
      toWaitlist,
      live: false,
      at: 2,
    },
  })

  it('draws adds, hides removes and decides requests in order without touching accepted data', () => {
    const ops: PendingRosterOp[] = [
      add('t1', 'pc'),
      { operation: { op: 'remove', operationId: 'r', rosterId: 'a' } },
      add('t2', 'pd', true),
      {
        operation: {
          op: 'acceptRequest',
          operationId: 'q',
          requestId: 'req',
          level: 'advanced_mid',
        },
        preview: { ...add('t3', 'pe').preview!, level: 'advanced_mid' },
      },
    ]
    const view = overlayRoster(sessionId, data, ops)
    expect(view.roster.map((r) => r.id)).toEqual(['b', 't1', 't3'])
    expect(view.waitlist.map((w) => w.id)).toEqual(['t2'])
    expect(view.joinRequests[0]?.status).toBe('confirmed')
    expect(data.roster.map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('never draws a player the accepted read or the server already has', () => {
    const resolved = new Map([
      ['t1', { operationId: 't1', rosterId: 'saved-1', waitlistId: null, clubPlayerId: 'pc' }],
    ])
    const refetched = { ...data, roster: [...data.roster, row('saved-1', 'pc')] }
    expect(overlayRoster(sessionId, refetched, [add('t1', 'pc')], resolved).roster).toHaveLength(3)
    expect(overlayRoster(sessionId, data, [add('t1', 'pb')]).roster).toHaveLength(2)
  })
})
