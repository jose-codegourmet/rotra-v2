'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useDebouncedBatch } from '../batch/useDebouncedBatch'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import type { getInventory } from './fetchers'
import { inventoryKeys } from './queryKeys'
import { getInventoryStockBatch, type InventoryStockCallbacks } from './stockBatch'

/** − / + intent: shown at once, saved debounced; flushes on page exit and unmount. */
export function useSetInventoryStock(callbacks: InventoryStockCallbacks = {}) {
  const client = useQueryClient()
  const shared = getInventoryStockBatch(client)
  const batch = useDebouncedBatch(shared.batch)
  function step(id: string, delta: -1 | 1) {
    const item = client
      .getQueryData<Awaited<ReturnType<typeof getInventory>>>(inventoryKeys.list(DEMO_CLUB_ID))
      ?.items.find((i) => i.id === id)
    if (!item) return
    const current = batch.value(id, item.stock)
    // Stock never goes below zero (Q-INVENTORY).
    const next = Math.max(0, current + delta)
    if (next === current) return
    shared.owner.callbacks = callbacks
    shared.owner.error = undefined
    batch.set(id, next, item.stock)
  }
  return { error: shared.owner.error, flush: batch.flush, step }
}
