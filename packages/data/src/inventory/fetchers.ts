import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import type { InventoryItem } from './inventory.types'

export async function getInventory() {
  await delay()
  requireClubAccess()
  const items = readMockState().inventory.filter((i) => i.clubId === DEMO_CLUB_ID && !i.removedAt)
  return {
    items: items.map((i) => ({ ...i, runningLow: i.stock <= 2 })),
    stockValue: items.reduce((sum, i) => sum + i.stock * i.unitCostMinor, 0),
  }
}
async function changeInventory<T>(
  change: (items: InventoryItem[]) => { data: T; message: string },
) {
  await delay()
  requireClubAccess()
  let outcome: { data: T; message: string } | undefined
  // Q10.5 follows the prototype pending the offline-inventory decision: edits work offline,
  // in memory only, and do not enter the operational sync change log.
  mockStore.update((draft) => {
    outcome = change(draft.inventory)
    checkMockSave()
    draft.sync.problem = undefined
  })
  if (!outcome) throw new Error('Inventory mutation produced no result.')
  return outcome
}
export type SaveInventoryItemInput = Omit<
  InventoryItem,
  'id' | 'clubId' | 'currency' | 'removedAt'
> & { id?: string }
export function saveInventoryItem(input: SaveInventoryItemInput) {
  return changeInventory((items) => {
    if (!input.name.trim()) throw new MockError('permission', 'Give the item a name.')
    if (
      !['shuttlecocks', 'equipment', 'other'].includes(input.category) ||
      !Number.isSafeInteger(input.stock) ||
      input.stock < 0 ||
      !Number.isSafeInteger(input.unitCostMinor) ||
      input.unitCostMinor < 0 ||
      input.unitCostMinor % 100 !== 0
    )
      throw new MockError('permission', 'Use whole numbers, 0 or more.')
    const existing = input.id
      ? items.find((i) => i.id === input.id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
      : undefined
    if (input.id && !existing) throw new MockError('permission', 'Item not available.')
    const item: InventoryItem = {
      ...input,
      id: existing?.id ?? crypto.randomUUID(),
      clubId: DEMO_CLUB_ID,
      currency: 'PHP',
      name: input.name.trim(),
      unit: input.unit.trim() || 'piece',
    }
    if (existing) Object.assign(existing, item)
    else items.push(item)
    return { data: item, message: existing ? 'Item saved' : `${item.name} added to inventory` }
  })
}
export function removeInventoryItem(id: string) {
  return changeInventory((items) => {
    const item = items.find((i) => i.id === id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
    if (!item) throw new MockError('permission', 'Item not available.')
    item.removedAt = Date.now()
    return { data: item, message: `${item.name} removed from inventory` }
  })
}
export function stepInventoryStock({ id, delta }: { id: string; delta: -1 | 1 }) {
  return changeInventory((items) => {
    const item = items.find((i) => i.id === id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
    if (!item) throw new MockError('permission', 'Item not available.')
    if (delta !== -1 && delta !== 1) throw new MockError('permission', 'Adjust stock by one unit.')
    item.stock = Math.max(0, item.stock + delta)
    return { data: item, message: 'Stock updated' }
  })
}
