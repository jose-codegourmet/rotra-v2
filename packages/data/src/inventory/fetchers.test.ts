import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setMockLatencyEnabled } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import {
  getInventory,
  removeInventoryItem,
  saveInventoryItem,
  stepInventoryStock,
} from './fetchers'

const wireItem = {
  id: '6f1c2f8e-5d4a-4c3b-9a2e-1b0c9d8e7f6a',
  clubId: '1a2b3c4d-0000-4000-8000-000000000001',
  name: 'Test Shuttles',
  category: 'shuttlecocks',
  unit: 'tube',
  stock: 2,
  unitCostMinor: 120_000,
  currency: 'PHP',
  removedAt: null,
  revision: '3',
}

const input = {
  name: 'Test Shuttles',
  category: 'shuttlecocks' as const,
  unit: 'tube',
  stock: 2,
  unitCostMinor: 120_000,
}

describe('Inventory › mock mode', () => {
  let restoreLatency: () => void
  beforeEach(() => {
    restoreLatency = setMockLatencyEnabled(false)
    mockStore.reset()
  })
  afterEach(() => restoreLatency())

  it('uses the sheet commandId as the new item ID and keeps commandId/revision off the item', async () => {
    const commandId = crypto.randomUUID()
    const result = await saveInventoryItem({ ...input, commandId, revision: '9' })
    const saved = readMockState().inventory.find((i) => i.id === commandId)
    expect(result.data.id).toBe(commandId)
    expect(saved).not.toHaveProperty('commandId')
    expect(saved).not.toHaveProperty('revision')
  })
})

describe('Inventory › real mode', () => {
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

  it('reads saved items with the same DTO shape: runningLow and stockValue in centavos', async () => {
    reply(200, { items: [wireItem], stockValueMinor: 240_000 })
    const inventory = await getInventory()
    expect(sent()).toMatchObject({ path: '/api/inventory', method: 'GET' })
    expect(inventory.stockValue).toBe(240_000)
    expect(inventory.items[0]).toMatchObject({ id: wireItem.id, runningLow: true, revision: '3' })
    expect(inventory.items[0]?.removedAt).toBeUndefined()
  })

  it('sends the commandId as the ID of an add, with no expected revision', async () => {
    const commandId = crypto.randomUUID()
    reply(200, { item: { ...wireItem, id: commandId } })
    const result = await saveInventoryItem({ ...input, commandId })
    expect(sent()).toMatchObject({ path: '/api/inventory', method: 'POST' })
    expect(sent().body).toMatchObject({ id: commandId, unitCostMinor: 120_000 })
    expect(sent().body).not.toHaveProperty('expectedRevision')
    expect(result.message).toContain('Test Shuttles added to inventory')
  })

  it('sends the displayed revision on an edit and surfaces a conflict', async () => {
    reply(409, { error: { code: 'conflict', message: 'This changed since you loaded it.' } })
    await expect(
      saveInventoryItem({ ...input, id: wireItem.id, revision: '3' }),
    ).rejects.toMatchObject({ kind: 'conflict' })
    expect(sent().body).toMatchObject({ id: wireItem.id, expectedRevision: '3' })
  })

  it('maps field errors to the form field names', async () => {
    reply(422, {
      error: {
        code: 'invalid',
        message: 'Check',
        fields: { unitCost: 'Enter a whole-peso amount.' },
      },
    })
    await expect(saveInventoryItem({ ...input, unitCostMinor: 150 })).rejects.toMatchObject({
      kind: 'permission',
      message: 'Enter a whole-peso amount.',
      fieldErrors: { unitCostMinor: 'Enter a whole-peso amount.' },
    })
  })

  it('steps and removes through the item routes, never the mock store', async () => {
    const before = mockStore.getSnapshot().inventory
    reply(200, { item: { ...wireItem, stock: 3 } })
    await stepInventoryStock({ id: wireItem.id, delta: 1 })
    expect(sent(0)).toMatchObject({
      path: `/api/inventory/${wireItem.id}/stock`,
      method: 'POST',
      body: { delta: 1 },
    })
    reply(200, { item: { ...wireItem, removedAt: '2026-11-01T00:00:00.000Z' } })
    const removed = await removeInventoryItem(wireItem.id)
    expect(sent(1)).toMatchObject({ path: `/api/inventory/${wireItem.id}`, method: 'DELETE' })
    expect(removed.message).toContain('Test Shuttles removed from inventory')
    expect(mockStore.getSnapshot().inventory).toBe(before)
  })

  it('refuses offline without calling the server', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(stepInventoryStock({ id: wireItem.id, delta: 1 })).rejects.toMatchObject({
      kind: 'offline',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
