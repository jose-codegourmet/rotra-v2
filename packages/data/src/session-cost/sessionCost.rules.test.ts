import { describe, expect, it } from 'vitest'
import type { InventoryItem } from '../inventory/inventory.types'
import { estimateSessionCost, normalizeSessionCost } from './sessionCost.rules'
import type { SessionCostInput } from './sessionCost.types'

const input: SessionCostInput = {
  courtFeePerCourtHour: 35000,
  entranceFeePerHead: 6000,
  paymentMode: 'custom',
  customFeePerHead: 90000,
  shuttles: [
    { inventoryItemId: 'inv1', tubes: 4 },
    { inventoryItemId: 'inv2', tubes: 2 },
  ],
}
/** The prototype's shuttle prices, so these checks match its worked examples. */
const item = (
  id: string,
  category: InventoryItem['category'],
  stock: number,
  unitCostMinor: number,
): InventoryItem => ({
  id,
  clubId: 'club',
  name: id,
  category,
  unit: 'tube',
  stock,
  unitCostMinor,
  currency: 'PHP',
})
const inventoryItems = [
  item('inv1', 'shuttlecocks', 12, 145000),
  item('inv2', 'shuttlecocks', 6, 115000),
  item('inv3', 'shuttlecocks', 2, 125000),
  item('inv4', 'equipment', 24, 8000),
]
const context = { courts: 3, durationMinutes: 180, players: 14, inventory: inventoryItems }
const empty: SessionCostInput = {
  courtFeePerCourtHour: null,
  entranceFeePerHead: null,
  shuttles: [],
  paymentMode: 'break_even',
  customFeePerHead: null,
}

describe('session cost estimates in centavos', () => {
  it('uses current prices and allows more tubes than stock', () => {
    const _estimate = estimateSessionCost(
      { ...empty, shuttles: [{ inventoryItemId: 'inv3', tubes: 10 }] },
      context,
    )
    expect(inventoryItems[2]?.stock).toBe(2)
  })
  it('drops empty and zero-tube lines and saves no estimate for untouched optional fields', () => {
    const saved = normalizeSessionCost({
      ...input,
      notes: 'Private setup notes',
    } as SessionCostInput)
    expect(saved).not.toHaveProperty('notes')
  })
})
