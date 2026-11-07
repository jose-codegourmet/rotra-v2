import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import {
  getMyJoinRequest,
  getPublicSession,
  PublicSessionNotFoundError,
  sendJoinRequest,
} from './fetchers'
import type { PublicSessionPage } from './publicSession.types'

const slug = 'thu-night-smash'

const wirePage: PublicSessionPage = {
  slug,
  status: 'prepared',
  title: 'Thursday Night Smash',
  start: Date.parse('2026-11-05T11:00:00.000Z'),
  end: Date.parse('2026-11-05T14:00:00.000Z'),
  club: { name: 'Test Club', initials: 'TC', logoUrl: null },
  venue: { name: 'Test Courts', address: null },
  courts: ['Court 1', 'Court 2'],
  formats: { singles: false, doubles: true },
  mode: 'fair',
  minimum: 3,
  notes: null,
  participants: [{ name: 'Ana Reyes', pictureUrl: null, hasRotraProfile: true }],
  skillMix: { beginner: 0, intermediate: 1, advanced: 0, unrated: 0 },
  waitlist: [],
  openSlots: 7,
  slotBudget: 8,
  acceptJoinRequests: true,
  lastSyncedAt: Date.parse('2026-11-02T00:00:00.000Z'),
  hasPendingChanges: false,
  results: null,
}

const mine = {
  requestId: '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a',
  name: 'Ben Cruz',
  status: 'pending' as const,
  waitlistPosition: null,
}

describe('Public session › real mode', () => {
  const fetchMock = vi.fn()
  const reply = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
  const sent = (call = 0) => {
    const [path, init] = fetchMock.mock.calls[call] as [string, RequestInit]
    return {
      path,
      method: init.method,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    }
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

  it('reads the page from the public route, never the mock store', async () => {
    const before = mockStore.getSnapshot()
    reply(200, wirePage)
    const page = await getPublicSession(slug, { visitor: true })
    expect(sent()).toMatchObject({ path: `/api/public-sessions/${slug}`, method: 'GET' })
    expect(page).toEqual(wirePage)
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('turns an unknown slug into PublicSessionNotFoundError', async () => {
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    await expect(getPublicSession('nope')).rejects.toBeInstanceOf(PublicSessionNotFoundError)
  })

  it('keeps other failures as they are', async () => {
    reply(503, { error: { code: 'unavailable', message: 'This is not available right now.' } })
    const error = await getPublicSession(slug).catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(PublicSessionNotFoundError)
    expect(error).toMatchObject({ kind: 'retryable' })
  })

  it('sends a join request with the sheet requestId', async () => {
    reply(200, mine)
    const result = await sendJoinRequest(slug, {
      requestId: mine.requestId,
      name: 'Ben Cruz',
      nickname: null,
      phone: '+639171234567',
      statedBand: 'intermediate',
    })
    expect(sent()).toMatchObject({
      path: `/api/public-sessions/${slug}/join-request`,
      method: 'POST',
      body: {
        requestId: mine.requestId,
        name: 'Ben Cruz',
        nickname: null,
        phone: '+639171234567',
        statedBand: 'intermediate',
      },
    })
    expect(result.data).toEqual({ requestId: mine.requestId })
    expect(result.savedOffline).toBe(false)
    expect(result.message).toContain('Request sent')
  })

  it('surfaces a refused request with the field message', async () => {
    reply(403, {
      error: {
        code: 'forbidden',
        message: 'You do not have access to this.',
        fields: { request: 'This session is not taking requests.' },
      },
    })
    await expect(
      sendJoinRequest(slug, { requestId: mine.requestId, name: 'Ben', statedBand: 'unsure' }),
    ).rejects.toMatchObject({ kind: 'permission', message: 'This session is not taking requests.' })
  })

  it('reads my request (or null) from the receipt route', async () => {
    reply(200, { ...mine, status: 'confirmed', waitlistPosition: 2 })
    expect(await getMyJoinRequest(slug)).toMatchObject({ status: 'confirmed', waitlistPosition: 2 })
    expect(sent()).toMatchObject({ path: `/api/public-sessions/${slug}/my-request`, method: 'GET' })
    reply(200, null)
    expect(await getMyJoinRequest(slug)).toBeNull()
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(
      sendJoinRequest(slug, { requestId: mine.requestId, name: 'Ben', statedBand: 'unsure' }),
    ).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
