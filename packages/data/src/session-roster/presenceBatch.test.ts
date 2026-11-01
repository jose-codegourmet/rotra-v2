import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushSessionPresence, presenceScope, registerBatchFlusher } from '../batch/flushBatches'
import { createConsoleFixtures } from '../fixtures/consoleSessions'
import { connectMockBridge, DEFAULT_DEV_STATE } from '../mock/bridge'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { getSessionRoster } from './fetchers'
import { setAllPresence, setPresenceMany, setRosterLevel } from './mutations'
import { getPresenceBatch } from './presenceBatch'
import { sessionRosterKeys } from './queryKeys'

const fixture = createConsoleFixtures(Date.now())
const sessionId = fixture.session.id
const ids = fixture.roster.slice(0, 5).map((r) => r.id)
let restoreLatency: () => void
let disconnect: (() => void) | undefined
beforeEach(() => {
  restoreLatency = setMockLatencyEnabled(false)
  mockStore.reset()
  mockStore.update((s) => {
    s.sessions = [fixture.session]
    s.roster = fixture.roster
    s.courts = fixture.courts
    s.matches = fixture.matches
  })
})
afterEach(() => {
  disconnect?.()
  disconnect = undefined
  restoreLatency()
})

describe('atomic presence batch', () => {
  it('saves five end states with one Roster entry and a unique waiting-match count', async () => {
    const waiting = fixture.matches.find((match) => match.state === 'waiting')
    if (!waiting) throw new Error('Waiting-match fixture missing')
    mockStore.update((s) => {
      s.matches = [
        { ...waiting, id: 'affected', teamA: [ids[0]!, ids[1]!], teamB: [ids[2]!, ids[3]!] },
        {
          ...waiting,
          id: 'unaffected',
          teamA: [fixture.roster[5]!.id, fixture.roster[6]!.id],
          teamB: [fixture.roster[7]!.id, fixture.roster[8]!.id],
        },
      ]
    })
    const before = readMockState()
    const wanted = ids.map((rosterId) => ({ rosterId, present: false }))
    const result = await setPresenceMany({ sessionId, changes: wanted })
    const state = readMockState()
    expect(state.roster.filter((p) => ids.includes(p.id)).every((p) => !p.present)).toBe(true)
    expect(state.sync.log).toHaveLength(before.sync.log.length + 1)
    expect(state.sync.log[0]?.area).toBe('Roster')
    expect(result.message).toBe('5 players marked away · 1 waiting match needs attention')
    expect(state.matches).toEqual(before.matches)
  })
  it('deduplicates players with the last wanted state and uses the mixed summary copy', async () => {
    const result = await setPresenceMany({
      sessionId,
      changes: [
        { rosterId: ids[0]!, present: false },
        { rosterId: ids[0]!, present: true },
        { rosterId: ids[1]!, present: false },
      ],
    })
    expect(result.message).toContain('1 player marked present, 1 away')
    expect(readMockState().roster.find((p) => p.id === ids[0])?.present).toBe(true)
  })
  it('records nothing for an empty batch and rejects a foreign roster id atomically', async () => {
    const before = readMockState()
    await setPresenceMany({ sessionId, changes: [] })
    await expect(
      setPresenceMany({
        sessionId,
        changes: [
          { rosterId: ids[0]!, present: false },
          { rosterId: 'foreign', present: false },
        ],
      }),
    ).rejects.toThrow('Player not available')
    expect(readMockState()).toEqual(before)
  })
  it.each([
    'finalizing',
    'completed',
    'invalid',
  ] as const)('rejects %s sessions without changing players or sync evidence', async (state) => {
    mockStore.update((s) => {
      s.sessions[0]!.state = state
    })
    const before = readMockState()
    await expect(
      setPresenceMany({ sessionId, changes: [{ rosterId: ids[0]!, present: false }] }),
    ).rejects.toThrow('read-only')
    expect(readMockState()).toEqual(before)
  })
  it('refuses offline without a download, but accepts one offline batch on a downloaded session', async () => {
    disconnect = connectMockBridge({
      consume: () => {},
      read: () => ({ ...DEFAULT_DEV_STATE, offline: true }),
    })
    const before = readMockState()
    await expect(
      setPresenceMany({ sessionId, changes: [{ rosterId: ids[0]!, present: false }] }),
    ).rejects.toThrow('No downloaded copy')
    expect(readMockState()).toEqual(before)
    mockStore.update((s) => {
      s.downloads[sessionId] = 'ready'
    })
    const result = await setPresenceMany({
      sessionId,
      changes: ids.map((rosterId) => ({ rosterId, present: false })),
    })
    expect(result.savedOffline).toBe(true)
    expect(result.message).toContain('waiting to sync')
  })
  it('preserves the active license exception and blocks expired preparation', async () => {
    disconnect = connectMockBridge({
      consume: () => {},
      read: () => ({ ...DEFAULT_DEV_STATE, licenseExpired: true }),
    })
    await expect(
      setPresenceMany({ sessionId, changes: [{ rosterId: ids[0]!, present: false }] }),
    ).resolves.toBeDefined()
    mockStore.update((s) => {
      s.sessions[0]!.state = 'prepared'
    })
    const before = readMockState()
    await expect(
      setPresenceMany({ sessionId, changes: [{ rosterId: ids[0]!, present: true }] }),
    ).rejects.toThrow('license')
    expect(readMockState()).toEqual(before)
  })
  it.each([
    'nextSaveFails',
    'nextSaveConflict',
  ] as const)('rolls back every player and log for %s', async (key) => {
    disconnect = connectMockBridge({
      consume: () => {},
      read: () => ({ ...DEFAULT_DEV_STATE, [key]: true }),
    })
    const before = readMockState()
    await expect(
      setPresenceMany({
        sessionId,
        changes: ids.map((rosterId) => ({ rosterId, present: false })),
      }),
    ).rejects.toThrow()
    expect(readMockState()).toEqual(before)
  })
  it('flushes presence before bulk presence and level writes', async () => {
    mockStore.update((s) => {
      s.sessions[0]!.state = 'prepared'
      s.roster[0]!.levelLockedAt = null
    })
    let sent = 0
    const unregister = registerBatchFlusher(presenceScope(sessionId), async () => {
      sent++
      await setPresenceMany({ sessionId, changes: [{ rosterId: ids[0]!, present: true }] })
    })
    try {
      await setAllPresence({ sessionId, present: false })
      expect(sent).toBe(1)
      expect(readMockState().roster.every((r) => !r.present)).toBe(true)
      await setRosterLevel({ sessionId, rosterId: ids[0]!, level: 'intermediate_mid' })
      expect(sent).toBe(2)
    } finally {
      unregister()
    }
  })
  it('shares intent across consumers and holds it until active-query refetch completes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const observer = new QueryObserver(client, {
      queryKey: sessionRosterKeys.list(sessionId),
      queryFn: () => getSessionRoster(sessionId),
    })
    const unsubscribe = observer.subscribe(() => {})
    await observer.refetch()
    const { batch, owner } = getPresenceBatch(client, sessionId)
    expect(getPresenceBatch(client, sessionId).batch).toBe(batch)
    const success = vi.fn()
    owner.callbacks = { onSuccess: success }
    batch.set(ids[0]!, false, true)
    expect(batch.value(ids[0]!, true)).toBe(false)
    await flushSessionPresence(sessionId)
    expect(
      client
        .getQueryData<Awaited<ReturnType<typeof getSessionRoster>>>(
          sessionRosterKeys.list(sessionId),
        )
        ?.roster.find((r) => r.id === ids[0])?.present,
    ).toBe(false)
    expect(batch.pendingKeys().size).toBe(0)
    expect(success).toHaveBeenCalledTimes(1)
    unsubscribe()
    client.clear()
  })
})
