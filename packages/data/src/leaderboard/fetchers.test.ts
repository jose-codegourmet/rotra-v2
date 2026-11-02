import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import { getLeaderboardPage, getMyLeaderboardPosition, searchLeaderboard } from './fetchers'

describe('Leaderboard › real mode', () => {
  const fetchMock = vi.fn()
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
  const sent = (call = 0) => {
    const [path, init] = fetchMock.mock.calls[call] as [string, RequestInit]
    return { path, method: init.method ?? 'GET' }
  }

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_ROTRA_DATA_MODE', 'real')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads a page from the Route Handler and returns the empty state, never fixture entries', async () => {
    const before = mockStore.getSnapshot()
    reply(200, { entries: [], total: 0 })
    const page = await getLeaderboardPage({ offset: 25, limit: 25 })
    expect(sent()).toMatchObject({ path: '/api/leaderboard?offset=25&limit=25', method: 'GET' })
    expect(page).toEqual({ entries: [], total: 0 })
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('passes stored entries through unchanged', async () => {
    const entry = {
      id: '0192f0aa-0000-7000-8000-000000000001',
      fullName: 'Test Player',
      nickname: null,
      playingLevel: 'intermediate_mid',
      pictureUrl: null,
      position: 1,
    }
    reply(200, { entries: [entry], total: 1 })
    expect(await getLeaderboardPage({ offset: 0 })).toEqual({ entries: [entry], total: 1 })
  })

  it('searches by encoded, trimmed name', async () => {
    reply(200, { hits: [], total: 0 })
    const result = await searchLeaderboard('  Ana & Co ')
    expect(sent().path).toBe('/api/leaderboard/search?q=Ana%20%26%20Co')
    expect(result).toEqual({ hits: [], total: 0 })
  })

  it('reads the signed-in position, null when not listed', async () => {
    reply(200, { position: null })
    expect(await getMyLeaderboardPosition()).toBeNull()
    expect(sent().path).toBe('/api/leaderboard/me')
  })

  it('surfaces a failed read as retryable instead of falling back to mock data', async () => {
    reply(500, { error: { code: 'internal', message: 'Something went wrong.' } })
    await expect(getLeaderboardPage({ offset: 0 })).rejects.toMatchObject({ kind: 'retryable' })
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(getLeaderboardPage({ offset: 0 })).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
