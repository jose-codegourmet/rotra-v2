import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, MockError, NotConnectedError } from '../mock/errors'
import {
  getRankingPolicy,
  getRankingSettings,
  rankingSettingsSaveError,
  saveRankingSettings,
  setRankingSettings,
} from './fetchers'

const wireVersion = (version: number, overrides: Record<string, unknown> = {}) => ({
  id: `0190f0a0-0000-7000-8000-00000000000${version}`,
  version,
  effectiveAt: '2026-11-01T01:00:00.000Z',
  assessmentWeightBp: 7000,
  performanceWeightBp: 3000,
  recentStandardMatchThreshold: 10,
  algorithmVersion: 'unapproved',
  changeNote: '',
  createdByDisplayName: '',
  createdAt: '2026-11-01T01:00:00.000Z',
  ...overrides,
})

const draft = {
  assessmentWeightBp: 6000,
  performanceWeightBp: 4000,
  recentStandardMatchThreshold: 12,
  changeNote: 'More weight on play',
}

describe('Ranking settings › real mode', () => {
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

  it('reads every saved version oldest first, with the newest in effect', async () => {
    reply(200, {
      versions: [
        wireVersion(1),
        wireVersion(2, { createdByDisplayName: 'ROTRA Admin', changeNote: 'Tuned' }),
      ],
    })
    const policy = await getRankingPolicy()
    expect(sent()).toMatchObject({ path: '/api/ranking-settings', method: 'GET' })
    expect(policy.versions.map((v) => v.version)).toEqual([1, 2])
    expect(policy.versions[0]).not.toHaveProperty('changeNote')
    expect(policy.effective).toEqual({
      version: 2,
      assessmentWeightBp: 7000,
      performanceWeightBp: 3000,
      recentStandardMatchThreshold: 10,
      effectiveAt: '2026-11-01T09:00:00+08:00',
      createdByEmail: 'ROTRA Admin',
      changeNote: 'Tuned',
    })
  })

  it('gives readers the version in effect as RankingSettings', async () => {
    reply(200, { versions: [wireVersion(1, { recentStandardMatchThreshold: 14 })] })
    expect(await getRankingSettings()).toEqual({
      assessmentWeightPercent: 70,
      matchRequirement: 14,
    })
  })

  it('is not connected (not a refusal) in an app without the route', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Not found</html>', { status: 404 }))
    await expect(getRankingSettings()).rejects.toBeInstanceOf(NotConnectedError)
  })

  it('saves under the base version with a command ID and returns the new version', async () => {
    reply(201, {
      version: wireVersion(2, { ...draft, createdByDisplayName: 'ROTRA Admin' }),
    })
    const saved = await saveRankingSettings({ draft, baseVersion: 1 })
    const { path, method, body } = sent()
    expect({ path, method }).toEqual({ path: '/api/ranking-settings', method: 'POST' })
    expect(body).toMatchObject({ ...draft, expectedVersion: 1 })
    expect(body.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(body).not.toHaveProperty('algorithmVersion')
    expect(saved).toMatchObject({
      version: 2,
      assessmentWeightBp: 6000,
      changeNote: draft.changeNote,
    })
  })

  it('turns a stale base version into a ConflictError carrying the version in effect', async () => {
    reply(409, { error: { code: 'conflict' } })
    reply(200, { versions: [wireVersion(1), wireVersion(2, { recentStandardMatchThreshold: 12 })] })
    const error = await saveRankingSettings({ draft, baseVersion: 1 }).catch((e) => e)
    expect(error).toBeInstanceOf(ConflictError)
    expect(error.current).toMatchObject({ version: 2, recentStandardMatchThreshold: 12 })
    expect(error.message).toBe('Version 2 was saved by someone else while you were editing.')
  })

  it('keeps the draft with the save-failed copy when the server fails', async () => {
    reply(500, { error: { code: 'internal' } })
    const error = await saveRankingSettings({ draft, baseVersion: 1 }).catch((e) => e)
    expect(error).toMatchObject({ kind: 'retryable', message: rankingSettingsSaveError(1) })
  })

  it('checks the draft before sending anything', async () => {
    const error = await saveRankingSettings({
      draft: { ...draft, performanceWeightBp: 3000 },
      baseVersion: 1,
    }).catch((e) => e)
    expect(error).toBeInstanceOf(MockError)
    expect(error.fieldErrors).toHaveProperty('total')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never writes through the dev settings control', async () => {
    await expect(
      setRankingSettings({ assessmentWeightPercent: 60, matchRequirement: 12 }),
    ).rejects.toBeInstanceOf(NotConnectedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
