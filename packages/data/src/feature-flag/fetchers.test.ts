import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConflictError, MockError } from '../mock/errors'
import { mockStore } from '../mock/store'
import {
  addFeatureFlag,
  isPlaceholderFeatureFlagShown,
  listFeatureFlags,
  setFeatureFlagValue,
  setPlaceholderFeatureFlagShown,
} from './fetchers'

const wireFlag = {
  key: 'session_cost_estimate',
  name: 'Session cost estimate',
  description: 'Shows the cost estimate step in session setup.',
  value: false,
  createdAt: '2026-11-01T02:00:00.000Z',
  createdByDisplayName: 'ROTRA Admin',
  updatedAt: '2026-11-01T03:30:00.000Z',
  updatedByDisplayName: 'Second Admin',
  revision: '2',
}

describe('Feature flags › real mode', () => {
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
    mockStore.reset()
    vi.stubEnv('NEXT_PUBLIC_ROTRA_DATA_MODE', 'real')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('lists saved flags in the FeatureFlag shape, times in Manila and the actor names', async () => {
    reply(200, { flags: [wireFlag] })
    const flags = await listFeatureFlags()
    expect(sent()).toMatchObject({ path: '/api/feature-flags', method: 'GET' })
    expect(flags).toEqual([
      {
        key: wireFlag.key,
        name: wireFlag.name,
        description: wireFlag.description,
        on: false,
        revision: 2,
        createdAt: '2026-11-01T10:00:00+08:00',
        createdByEmail: 'ROTRA Admin',
        changedAt: '2026-11-01T11:30:00+08:00',
        changedByEmail: 'Second Admin',
      },
    ])
  })

  it('adds a flag with trimmed values, the starting value and a command ID', async () => {
    reply(201, { flag: { ...wireFlag, value: true, revision: '1' } })
    const flag = await addFeatureFlag({
      name: '  Session cost estimate ',
      key: ' session_cost_estimate',
      description: wireFlag.description,
      on: true,
    })
    const { path, method, body } = sent()
    expect({ path, method }).toEqual({ path: '/api/feature-flags', method: 'POST' })
    expect(body).toMatchObject({
      name: 'Session cost estimate',
      key: 'session_cost_estimate',
      on: true,
    })
    expect(body.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(flag).toMatchObject({ on: true, revision: 1 })
  })

  it('passes a taken name back as a conflict with the field error', async () => {
    reply(409, {
      error: { code: 'conflict', fields: { name: 'A flag with this name already exists.' } },
    })
    const error = await addFeatureFlag({
      name: wireFlag.name,
      key: 'other_key',
      description: wireFlag.description,
      on: false,
    }).catch((e) => e)
    expect(error).toBeInstanceOf(MockError)
    expect(error).toMatchObject({
      kind: 'conflict',
      fieldErrors: { name: 'A flag with this name already exists.' },
    })
  })

  it('switches under the loaded revision', async () => {
    reply(200, { flag: { ...wireFlag, value: true, revision: '3' } })
    const flag = await setFeatureFlagValue({ key: wireFlag.key, on: true, revision: 2 })
    expect(sent()).toEqual({
      path: '/api/feature-flags/session_cost_estimate',
      method: 'PATCH',
      body: { on: true, expectedRevision: '2' },
    })
    expect(flag).toMatchObject({ on: true, revision: 3 })
  })

  it('turns a stale revision into a ConflictError carrying the flag as it is now', async () => {
    reply(409, { error: { code: 'conflict', message: 'This changed since you loaded it.' } })
    reply(200, { flags: [{ ...wireFlag, value: true, revision: '3' }] })
    const error = await setFeatureFlagValue({ key: wireFlag.key, on: true, revision: 2 }).catch(
      (e) => e,
    )
    expect(error).toBeInstanceOf(ConflictError)
    expect(error.current).toMatchObject({ key: wireFlag.key, on: true, revision: 3 })
    expect(error.message).toContain("It's on now")
  })

  it('never shows the dev placeholder flag over saved flags', () => {
    setPlaceholderFeatureFlagShown(true)
    expect(isPlaceholderFeatureFlagShown()).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
