import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStore } from '../mock/store'
import { getSessionCostEstimate } from '../session-cost/fetchers'
import { getSessionPayments, markAllPaid, setPaymentMarks, togglePaid } from './fetchers'

const sessionId = '5e2a7c1d-0000-4000-8000-000000000001'
const clubPlayerId = '7b3c9d2e-0000-4000-8000-000000000002'
const itemId = '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a'

const input = {
  courtFeePerCourtHour: 40_000,
  entranceFeePerHead: null,
  paymentMode: 'break_even' as const,
  customFeePerHead: null,
  shuttles: [{ inventoryItemId: itemId, tubes: 2 }],
}
const estimate = {
  players: 4,
  court: 160_000,
  shuttle: 240_000,
  entrance: 0,
  entranceFeePerHead: 0,
  total: 400_000,
  breakEven: 100_000,
  perHead: 100_000,
  isCustom: false,
  collect: 400_000,
  result: { kind: 'breaks_even', amount: 0 },
}
const wirePayments = {
  players: [
    {
      sessionPlayerId: 'a1',
      clubPlayerId,
      name: 'Ana Cruz',
      paid: { amount: { amountMinor: 100_000, currency: 'PHP' }, at: '2026-11-01T10:00:00.000Z' },
    },
    { sessionPlayerId: 'a2', clubPlayerId: 'other', name: 'Ben Diaz', paid: null },
  ],
  amountDue: 100_000,
  dueBasis: 'break_even',
  entranceFeeIncluded: null,
  totals: {
    paid: 1,
    total: 2,
    collected: 100_000,
    stillDue: 100_000,
    againstCosts: -300_000,
    cost: 400_000,
  },
}

describe('Session cost and payments › real mode', () => {
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

  it('reads the saved estimate in the mock shape, with plan line names', async () => {
    reply(200, {
      cost: {
        input,
        estimate,
        revision: '2',
        courts: 2,
        durationMinutes: 120,
        shuttleLines: [{ inventoryItemId: itemId, tubes: 2, name: 'Test Shuttles' }],
      },
    })
    const cost = await getSessionCostEstimate(sessionId)
    expect(sent()).toMatchObject({ path: `/api/sessions/${sessionId}/cost`, method: 'GET' })
    expect(cost).toMatchObject({
      saved: { ...input, sessionId, currency: 'PHP' },
      estimate: { perHead: 100_000 },
      courts: 2,
      durationMinutes: 120,
      shuttleLines: [{ id: `${sessionId}-0`, name: 'Test Shuttles', tubes: 2 }],
    })
  })

  it('reads no estimate as null ("No fee set")', async () => {
    reply(200, {
      cost: {
        input: null,
        estimate: null,
        revision: null,
        courts: 0,
        durationMinutes: 120,
        shuttleLines: [],
      },
    })
    expect(await getSessionCostEstimate(sessionId)).toBeNull()
  })

  it('reads payments with recorded amounts in centavos and times in ms', async () => {
    reply(200, { payments: wirePayments })
    const payments = await getSessionPayments(sessionId)
    expect(sent()).toMatchObject({ path: `/api/sessions/${sessionId}/payments`, method: 'GET' })
    expect(payments?.players[0]?.paid).toEqual({
      amount: 100_000,
      at: Date.parse('2026-11-01T10:00:00.000Z'),
    })
    expect(payments?.players[1]?.paid).toBeUndefined()
    expect(payments?.entranceFeeIncluded).toBeUndefined()
    expect(payments?.totals).toEqual(wirePayments.totals)
  })

  it('reads an invalid session as null', async () => {
    reply(200, { payments: null })
    expect(await getSessionPayments(sessionId)).toBeNull()
  })

  it('sends one batch of desired states under one operation ID, never the mock store', async () => {
    const before = mockStore.getSnapshot().paymentMarks
    reply(200, { count: 2, marks: [] })
    const result = await setPaymentMarks({
      sessionId,
      marks: [
        { clubPlayerId, paid: true },
        { clubPlayerId: 'other', paid: false },
      ],
    })
    expect(sent()).toMatchObject({ path: `/api/sessions/${sessionId}/payments`, method: 'POST' })
    expect(sent().body.marks).toEqual([
      { clubPlayerId, paid: true },
      { clubPlayerId: 'other', paid: false },
    ])
    expect(sent().body.operationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.data.count).toBe(2)
    expect(result.savedOffline).toBe(false)
    expect(mockStore.getSnapshot().paymentMarks).toBe(before)
  })

  it('surfaces a refused no-fee tick instead of saving it (#245)', async () => {
    reply(422, {
      error: {
        code: 'invalid',
        message: 'Check',
        fields: { fee: 'Paid ticks with no fee set aren’t connected to saved data yet.' },
      },
    })
    await expect(
      setPaymentMarks({ sessionId, marks: [{ clubPlayerId, paid: true }] }),
    ).rejects.toMatchObject({ message: expect.stringContaining('no fee set') })
  })

  it('toggles from the saved state and shows the recorded amount', async () => {
    reply(200, { payments: wirePayments })
    reply(200, {
      count: 1,
      marks: [
        { clubPlayerId: 'other', paid: true, amount: { amountMinor: 100_000, currency: 'PHP' } },
      ],
    })
    const result = await togglePaid({ sessionId, clubPlayerId: 'other' })
    expect(sent(1).body.marks).toEqual([{ clubPlayerId: 'other', paid: true }])
    expect(result.data.paid).toBe(true)
    expect(result.message).toContain('Ben Diaz paid')
  })

  it('marks all paid through its route', async () => {
    reply(200, { count: 3 })
    const result = await markAllPaid(sessionId)
    expect(sent()).toMatchObject({
      path: `/api/sessions/${sessionId}/payments/mark-all`,
      method: 'POST',
    })
    expect(sent().body.operationId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.message).toContain('3 players marked paid')
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(
      setPaymentMarks({ sessionId, marks: [{ clubPlayerId, paid: true }] }),
    ).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
