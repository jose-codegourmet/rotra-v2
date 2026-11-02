import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import {
  getMyAccount,
  getResetLink,
  requestPasswordReset,
  setPhonePrivacy,
} from '../player-account/fetchers'
import { NOT_CONNECTED_MESSAGE } from '../real/mode'
import {
  findPlayerByRtrId,
  getPlayerGames,
  getPlayerProfile,
  getPlayerRank,
  updateMyProfile,
} from './fetchers'

const playerId = '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a'

const wireProfile = {
  playerId,
  rtrId: 'RTR-PH-CEB-102926-0001',
  fullName: 'Test Player',
  nickname: null,
  picture: null,
  playingStyle: '',
  experienceYears: null,
  experienceMonths: null,
  socialLinks: { facebook: '', instagram: '', youtube: '', linkedin: '' },
}

const wireAccount = {
  playerId,
  phone: '+639170000000',
  email: 'test.player@example.invalid',
  phoneHidden: false,
  revision: '4',
}

const personal = {
  fullName: 'Test Player',
  nickname: '',
  playingStyle: '',
  experienceYears: '2',
  experienceMonths: '',
  facebook: '',
  instagram: '',
  youtube: '',
  linkedin: '',
}

describe('Player Information › real mode', () => {
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

  it('reads a public profile, and a missing one is null', async () => {
    const before = mockStore.getSnapshot()
    reply(200, { profile: wireProfile })
    expect(await getPlayerProfile(playerId)).toEqual(wireProfile)
    expect(sent()).toMatchObject({ path: `/api/players/${playerId}`, method: 'GET' })
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    expect(await getPlayerProfile('nobody')).toBeNull()
    expect(mockStore.getSnapshot()).toBe(before)
  })

  it('passes the stored rank through unchanged, including no rank yet', async () => {
    const rank = {
      playerId,
      fullName: 'Test Player',
      nickname: null,
      levelIndex: null,
      state: 'provisional',
      updatePending: null,
      position: null,
      recentCount: 3,
      olderCount: 0,
    }
    reply(200, { rank })
    expect(await getPlayerRank(playerId)).toEqual(rank)
    expect(sent()).toMatchObject({ path: `/api/players/${playerId}/rank` })
    reply(200, { rank: null })
    expect(await getPlayerRank(playerId)).toBeNull()
  })

  it('reads history and resolves an RTR ID to a player ID (unknown is null)', async () => {
    reply(200, { games: [] })
    expect(await getPlayerGames(playerId)).toEqual([])
    expect(sent(0).path).toBe(`/api/players/${playerId}/games`)
    reply(200, { playerId })
    expect(await findPlayerByRtrId(' rtr-ph-ceb-102926-0001 ')).toEqual({ playerId })
    expect(sent(1).path).toBe('/api/rtr-ids/RTR-PH-CEB-102926-0001')
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    expect(await findPlayerByRtrId('RTR-XX')).toBeNull()
  })

  it('returns the own account without its revision; signed out is null', async () => {
    reply(200, { account: wireAccount })
    const account = await getMyAccount()
    expect(sent()).toMatchObject({ path: '/api/me/account', method: 'GET' })
    expect(account).toEqual({
      playerId,
      phone: wireAccount.phone,
      email: wireAccount.email,
      phoneHidden: false,
    })
    reply(401, { error: { code: 'unauthenticated', message: 'Sign in to continue.' } })
    expect(await getMyAccount()).toBeNull()
  })

  it('saves the profile and phone privacy under the loaded revision', async () => {
    reply(200, { account: wireAccount })
    await getMyAccount()
    reply(200, { profile: wireProfile, revision: '5' })
    await updateMyProfile(personal)
    expect(sent(1)).toMatchObject({
      path: '/api/me/profile',
      method: 'PATCH',
      body: { expectedRevision: '4', fullName: 'Test Player', experienceYears: 2 },
    })
    expect(sent(1).body).not.toHaveProperty('phone')
    expect(sent(1).body).not.toHaveProperty('email')
    reply(200, { account: { ...wireAccount, phoneHidden: true, revision: '6' } })
    const saved = await setPhonePrivacy({ phoneHidden: true })
    expect(sent(2)).toMatchObject({
      path: '/api/me/phone-privacy',
      method: 'POST',
      body: { phoneHidden: true, expectedRevision: '5' },
    })
    expect(saved).not.toHaveProperty('revision')
    reply(409, { error: { code: 'conflict', message: 'This changed since you loaded it.' } })
    await expect(setPhonePrivacy({ phoneHidden: false })).rejects.toMatchObject({
      kind: 'conflict',
    })
    expect(sent(3).body.expectedRevision).toBe('6')
  })

  it('rejects contact fields in a profile save without calling the server', async () => {
    await expect(
      updateMyProfile({ ...personal, email: 'x@example.invalid' } as typeof personal),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves password reset not connected, never falling back to the mock store', async () => {
    await expect(requestPasswordReset('a@example.invalid')).rejects.toMatchObject({
      message: NOT_CONNECTED_MESSAGE,
    })
    await expect(getResetLink('token')).rejects.toMatchObject({ message: NOT_CONNECTED_MESSAGE })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
