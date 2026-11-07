import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { checkMockSave } from '../mock/bridge'
import { MockError } from '../mock/errors'
import { delay } from '../mock/latency'
import { mockStore, readMockState } from '../mock/store'
import { requireClubAccess } from '../mock/transaction'
import { isRealDataMode } from '../real/mode'
import {
  realGetInventory,
  realRemoveInventoryItem,
  realSaveInventoryItem,
  realSetInventoryStock,
  realStepInventoryStock,
} from '../real/queue'
import type { InventoryItem } from './inventory.types'

export async function getInventory() {
  if (isRealDataMode()) return realGetInventory()
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
/** `commandId` is generated once per open sheet; an add uses it as the new item's ID. */
export type SaveInventoryItemInput = Omit<
  InventoryItem,
  'id' | 'clubId' | 'currency' | 'removedAt'
> & { id?: string; commandId?: string }
export function saveInventoryItem(input: SaveInventoryItemInput) {
  if (isRealDataMode()) return realSaveInventoryItem(input)
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
    const { commandId, revision: _revision, ...fields } = input
    const item: InventoryItem = {
      ...fields,
      id: existing?.id ?? commandId ?? crypto.randomUUID(),
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
  if (isRealDataMode()) return realRemoveInventoryItem(id)
  return changeInventory((items) => {
    const item = items.find((i) => i.id === id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
    if (!item) throw new MockError('permission', 'Item not available.')
    item.removedAt = Date.now()
    return { data: item, message: `${item.name} removed from inventory` }
  })
}
/** The debounced − / + save: the intended end stock (never a delta), 0 or more. */
export function setInventoryStock({ item, stock }: { item: InventoryItem; stock: number }) {
  if (isRealDataMode()) return realSetInventoryStock(item, stock)
  return changeInventory((items) => {
    const saved = items.find((i) => i.id === item.id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
    if (!saved) throw new MockError('permission', 'Item not available.')
    if (!Number.isSafeInteger(stock) || stock < 0)
      throw new MockError('permission', 'Stock can’t go below zero.')
    saved.stock = stock
    return { data: saved, message: 'Stock updated' }
  })
}
export function stepInventoryStock({ id, delta }: { id: string; delta: -1 | 1 }) {
  if (isRealDataMode()) return realStepInventoryStock({ id, delta })
  return changeInventory((items) => {
    const item = items.find((i) => i.id === id && i.clubId === DEMO_CLUB_ID && !i.removedAt)
    if (!item) throw new MockError('permission', 'Item not available.')
    if (delta !== -1 && delta !== 1) throw new MockError('permission', 'Adjust stock by one unit.')
    item.stock = Math.max(0, item.stock + delta)
    return { data: item, message: 'Stock updated' }
  })
}
