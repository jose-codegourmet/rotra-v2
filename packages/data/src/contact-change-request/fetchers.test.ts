import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listAuditEvents } from '../admin-audit/fetchers'
import { MockError, NotConnectedError } from '../mock/errors'
import {
  advanceContactChangeRequest,
  approveContactChange,
  checkContactApplication,
  declineContactChange,
  getContactRequest,
  getContactRequestCounts,
  getMyContactChangeRequest,
  listContactRequests,
  retryContactApplication,
  submitContactChangeRequest,
} from './fetchers'

const PLAYER = '0190a1b2-0000-7000-8000-000000000001'
const OTHER = '0190a1b2-0000-7000-8000-000000000002'
const REQUEST = '0190a1b2-0000-7000-8000-0000000000a1'

const wirePlayer = {
  id: PLAYER,
  fullName: 'Test Player',
  rtrId: 'RTR-MNL-260101-0001',
  nickname: null,
  claimed: true,
  phone: '+639170000001',
  email: 'test.player@example.invalid',
}

const wireRequest = (over: Record<string, unknown> = {}) => ({
  requestId: REQUEST,
  playerId: PLAYER,
  field: 'phone',
  fromValue: '+639170000001',
  toValue: '+639170000009',
  status: 'pending',
  source: 'app',
  requestedAt: '2026-11-01T02:00:00.000Z',
  approvedAt: null,
  appliedAt: null,
  decidedAt: null,
  failureCode: null,
  player: wirePlayer,
  checks: [
    { kind: 'linked-elsewhere', ok: true },
    { kind: 'newer-request', ok: true },
    { kind: 'original-changed', ok: true },
    { kind: 'in-progress', ok: true },
  ],
  ...over,
})

describe('Contact-change requests and audit › real mode', () => {
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

  it("reads the player's own latest request and shows phones grouped", async () => {
    reply(200, {
      request: {
        id: REQUEST,
        playerId: PLAYER,
        field: 'phone',
        originalValue: '+639170000001',
        proposedValue: '+639170000009',
        status: 'approved_pending',
        requestedAt: '2026-11-01T02:00:00.000Z',
        appliedAt: null,
        rejectedAt: null,
      },
    })
    const request = await getMyContactChangeRequest()
    expect(sent().path).toBe('/api/account/contact-change')
    expect(request).toEqual({
      requestId: REQUEST,
      playerId: PLAYER,
      field: 'phone',
      fromValue: '+63 917 000 0001',
      toValue: '+63 917 000 0009',
      status: 'approved',
      requestedAt: Date.parse('2026-11-01T02:00:00.000Z'),
    })
  })

  it('reads no request when signed out', async () => {
    reply(401, { error: { code: 'unauthenticated', message: 'Sign in to continue.' } })
    await expect(getMyContactChangeRequest()).resolves.toBeNull()
  })

  it('validates, then sends a normalized value with a fresh command ID', async () => {
    await expect(
      submitContactChangeRequest({ field: 'phone', toValue: '12' }),
    ).rejects.toMatchObject({ fieldErrors: { toValue: expect.any(String) } })
    expect(fetchMock).not.toHaveBeenCalled()
    reply(201, {
      request: {
        id: REQUEST,
        playerId: PLAYER,
        field: 'email',
        originalValue: 'test.player@example.invalid',
        proposedValue: 'new@example.invalid',
        status: 'pending',
        requestedAt: '2026-11-01T02:00:00.000Z',
        appliedAt: null,
        rejectedAt: null,
      },
    })
    const created = await submitContactChangeRequest({
      field: 'email',
      toValue: 'New@Example.invalid',
    })
    const call = sent()
    expect(call.method).toBe('POST')
    expect(call.body).toMatchObject({ field: 'email', value: 'new@example.invalid' })
    expect(call.body.commandId).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.status).toBe('pending')
  })

  it('maps an open request and a taken contact to the sheet errors', async () => {
    reply(409, {
      error: { code: 'conflict', message: 'x', fields: { request: 'already open' } },
    })
    await expect(
      submitContactChangeRequest({ field: 'phone', toValue: '0917 000 0009' }),
    ).rejects.toMatchObject({ kind: 'conflict', message: 'request-open' })
    reply(409, { error: { code: 'conflict', message: 'x', fields: { value: 'Taken.' } } })
    await expect(
      submitContactChangeRequest({ field: 'phone', toValue: '0917 000 0009' }),
    ).rejects.toMatchObject({ kind: 'conflict', fieldErrors: { toValue: 'Taken.' } })
  })

  it('lists with the mock filters and counts, scoped to a player', async () => {
    const all = () =>
      reply(200, {
        requests: [
          wireRequest(),
          wireRequest({
            requestId: '0190a1b2-0000-7000-8000-0000000000a2',
            status: 'rejected',
            decidedAt: '2026-11-01T03:00:00.000Z',
            checks: null,
          }),
          wireRequest({
            requestId: '0190a1b2-0000-7000-8000-0000000000a3',
            playerId: OTHER,
            player: { ...wirePlayer, id: OTHER },
            status: 'failed',
            failureCode: 'provider_rejected',
            checks: null,
          }),
        ],
      })
    all()
    const list = await listContactRequests({ status: 'pending', playerId: PLAYER })
    expect(sent().path).toBe('/api/contact-change-requests')
    expect(list.rows.map((row) => row.requestId)).toEqual([REQUEST])
    expect(list.rows[0]).not.toHaveProperty('checks')
    expect(list.rows[0]?.nextAction).toBe('Review')
    expect(list.counts).toMatchObject({ all: 2, pending: 1, rejected: 1, attention: 1 })
    all()
    expect(await getContactRequestCounts()).toMatchObject({ all: 3, failed: 1, attention: 2 })
  })

  it('reads one request with its checks; not found is null', async () => {
    reply(200, {
      request: wireRequest({
        checks: [
          {
            kind: 'linked-elsewhere',
            ok: false,
            otherPlayer: { id: OTHER, fullName: 'Other', rtrId: 'RTR-X' },
          },
          { kind: 'newer-request', ok: true },
          { kind: 'original-changed', ok: true },
          { kind: 'in-progress', ok: true },
        ],
      }),
    })
    const detail = await getContactRequest(REQUEST)
    expect(sent().path).toBe(`/api/contact-change-requests/${REQUEST}`)
    expect(detail).toMatchObject({ blocked: true, nextAction: 'Review · blocked' })
    expect(detail?.providerOperationRef).toBeNull()
    reply(404, { error: { code: 'not_found', message: 'Not found.' } })
    await expect(getContactRequest(REQUEST)).resolves.toBeNull()
  })

  it('declines through the Admin route; a request decided elsewhere is stale', async () => {
    reply(200, {
      request: wireRequest({ status: 'rejected', decidedAt: '2026-11-01T03:00:00Z', checks: null }),
    })
    const declined = await declineContactChange(REQUEST)
    expect(sent()).toMatchObject({
      path: `/api/contact-change-requests/${REQUEST}/decline`,
      method: 'POST',
    })
    expect(declined.status).toBe('rejected')
    reply(200, { request: wireRequest({ status: 'applied', checks: null }) })
    await expect(declineContactChange(REQUEST)).rejects.toMatchObject({ kind: 'conflict' })
    reply(409, { error: { code: 'conflict', message: 'x' } })
    await expect(declineContactChange(REQUEST)).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('never sends approve, retry, check status or the DevMenu advance', async () => {
    await expect(approveContactChange(REQUEST)).rejects.toBeInstanceOf(NotConnectedError)
    await expect(retryContactApplication(REQUEST)).rejects.toBeInstanceOf(NotConnectedError)
    await expect(checkContactApplication(REQUEST)).rejects.toBeInstanceOf(NotConnectedError)
    await expect(
      advanceContactChangeRequest({ requestId: REQUEST, to: 'applied' }),
    ).rejects.toBeInstanceOf(NotConnectedError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads a record of actions with the actor display name', async () => {
    reply(200, {
      events: [
        {
          id: 'e1',
          action: 'contact_change_declined',
          targetType: 'contact_change_request',
          targetId: REQUEST,
          at: '2026-11-01T03:00:00.000Z',
          actor: 'ROTRA Admin',
          summary: 'Declined phone number change for Test Player.',
        },
      ],
    })
    const events = await listAuditEvents({
      targetType: 'contact_change_request',
      targetId: REQUEST,
    })
    expect(sent().path).toBe(
      `/api/audit-events?targetType=contact_change_request&targetId=${REQUEST}`,
    )
    expect(events[0]).toMatchObject({
      actorEmail: 'ROTRA Admin',
      action: 'contact_change_declined',
    })
    expect(events[0]).not.toHaveProperty('actor')
  })

  it('leaves flag and ranking logs not connected', async () => {
    await expect(
      listAuditEvents({ targetType: 'feature_flag', targetId: 'f1' }),
    ).rejects.toBeInstanceOf(MockError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
