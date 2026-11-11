import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDeviceDownloads } from '../device/fetchers'
import { mockStore } from '../mock/store'
import { connectRealSync } from '../real/sync'
import {
  answerInterruption,
  getSessionIntegrity,
  getSyncLog,
  getSyncState,
  getSyncStatus,
  retrySync,
} from './fetchers'
import { syncKeys } from './queryKeys'
import type { SyncState, SyncStatus } from './sync.types'

const sessionId = '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a'
const checkedAt = '2026-11-02T10:15:00.000Z'
const proven = { proven: true, openStreams: 0, openConflicts: 0, pendingOperations: 0 }

describe('Sync, device and offline › real mode', () => {
  const fetchMock = vi.fn()
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
  const sentPath = (call = 0) => (fetchMock.mock.calls[call] as [string, RequestInit])[0]

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROTRA_DATA_MODE', 'real')
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('navigator', { onLine: true })
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports nothing waiting on this device and the server-checked time', async () => {
    reply(200, { incompleteSessionIds: [], checkedAt })
    const status = await getSyncStatus()
    expect(sentPath()).toBe('/api/sync')
    expect(status).toMatchObject({
      connectivity: 'online',
      syncing: false,
      pendingCount: 0,
      lastSyncedAt: Date.parse(checkedAt),
      incompleteRecords: false,
    })
    expect(status.problem).toBeUndefined()
  })

  it('flags incomplete records the server cannot prove complete', async () => {
    reply(200, { incompleteSessionIds: [sessionId], checkedAt })
    expect((await getSyncStatus()).incompleteRecords).toBe(true)
  })

  it('offline: never calls the server and keeps the last checked time', async () => {
    reply(200, { incompleteSessionIds: [], checkedAt })
    await getSyncState()
    vi.stubGlobal('navigator', { onLine: false })
    fetchMock.mockReset()
    const state = await getSyncState()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(state).toMatchObject({
      online: false,
      pendingCount: 0,
      lastSyncedAt: Date.parse(checkedAt),
    })
    expect(await retrySync()).toEqual({ message: 'Waiting for internet' })
  })

  it('keeps no device change log and never reads the mock store', async () => {
    const before = mockStore.getSnapshot().sync
    expect(await getSyncLog()).toEqual({ pendingChanges: [], syncedChanges: [] })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockStore.getSnapshot().sync).toBe(before)
  })

  it('maps proven server completeness to a complete session', async () => {
    reply(200, { streams: [], conflicts: [], completeness: proven })
    const integrity = await getSessionIntegrity(sessionId)
    expect(sentPath()).toBe(`/api/sessions/${sessionId}/sync`)
    expect(integrity).toEqual({ sessionId, state: 'complete', missingSummary: [], conflicts: [] })
  })

  it('shows unproven completeness as missing records with the server counts, no invented evidence', async () => {
    reply(200, {
      streams: [{ state: 'open' }],
      conflicts: [{ id: 'c1', category: 'missing_prerequisite', detectedAt: checkedAt }],
      completeness: { proven: false, openStreams: 1, openConflicts: 1, pendingOperations: 0 },
    })
    const integrity = await getSessionIntegrity(sessionId)
    expect(integrity.state).toBe('records_missing')
    expect(integrity.conflicts).toEqual([])
    expect(integrity.missingSummary.map((m) => m.label)).toEqual([
      'Device records not closed',
      'Sync conflicts',
    ])
  })

  it('surfaces another club’s session as a refusal', async () => {
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    await expect(getSessionIntegrity(sessionId)).rejects.toMatchObject({ status: 404 })
  })

  it('Yes to the interruption question replays this device (nothing waits here) and re-checks the server (#722)', async () => {
    reply(200, { streams: [], conflicts: [], completeness: proven })
    const integrity = await answerInterruption({ sessionId, answer: 'yes' })
    expect(sentPath()).toBe(`/api/sessions/${sessionId}/sync`)
    expect(integrity).toEqual({ sessionId, state: 'complete', missingSummary: [], conflicts: [] })
  })

  it('offline, an unsynced session is reported as records missing, not checked with the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const integrity = await getSessionIntegrity(sessionId)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(integrity.state).toBe('records_missing')
    expect(integrity.missingSummary.map((m) => m.label)).toEqual(['Not connected'])
  })

  it('lists no device downloads where there is no device storage, without asking the server (#477)', async () => {
    expect(typeof indexedDB).toBe('undefined')
    await expect(getDeviceDownloads()).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('marks the cached status offline when the browser goes offline', () => {
    const events = new EventTarget()
    vi.stubGlobal('window', events)
    const client = new QueryClient()
    client.setQueryData<SyncStatus>(syncKeys.status(), {
      connectivity: 'online',
      syncing: false,
      pendingCount: 0,
      lastSyncedAt: 1,
      incompleteRecords: false,
      canFinishAndSync: true,
    })
    client.setQueryData<Partial<SyncState>>(syncKeys.state(), { online: true })
    const disconnect = connectRealSync(client)
    vi.stubGlobal('navigator', { onLine: false })
    events.dispatchEvent(new Event('offline'))
    expect(client.getQueryData<SyncStatus>(syncKeys.status())?.connectivity).toBe('offline')
    expect(client.getQueryData<SyncState>(syncKeys.state())?.online).toBe(false)
    disconnect()
  })
})
