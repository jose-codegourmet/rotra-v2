'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { getInventory } from './fetchers'
import { inventoryKeys } from './queryKeys'
import { getInventoryStockBatch } from './stockBatch'
export function useInventory() {
  const client = useQueryClient()
  const { batch } = getInventoryStockBatch(client)
  useSyncExternalStore(batch.subscribe, batch.getSnapshot, () => 0)
  const query = useQuery({
    queryKey: inventoryKeys.list(DEMO_CLUB_ID),
    queryFn: () => getInventory(),
  })
  if (!query.data) return query
  // Unsaved − / + intent shows over accepted stock (#467).
  const items = query.data.items.map((item) => {
    const stock = batch.value(item.id, item.stock)
    return stock === item.stock ? item : { ...item, stock, runningLow: stock <= 2 }
  })
  return {
    ...query,
    data: {
      ...query.data,
      items,
      stockValue: items.reduce((sum, i) => sum + i.stock * i.unitCostMinor, 0),
    },
  }
}
