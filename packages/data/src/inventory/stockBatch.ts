import type { QueryClient } from '@tanstack/react-query'
import { createDebouncedBatch } from '../batch/debouncedBatch'
import { DEMO_CLUB_ID } from '../fixtures/clubs'
import { getInventory, setInventoryStock } from './fetchers'
import { inventoryKeys } from './queryKeys'

export type InventoryStockCallbacks = {
  onSuccess?: (result: { message: string }) => void
  onError?: (error: Error) => void
}
type AcceptedInventory = Awaited<ReturnType<typeof getInventory>>

/**
 * #467: − / + updates the shown stock at once; 800 ms after the last tap each changed item saves
 * its intended end stock (an absolute value, never a delta), as payments do (#300).
 */
function createStockBatch(client: QueryClient) {
  const owner = { callbacks: {} as InventoryStockCallbacks, error: undefined as Error | undefined }
  const key = inventoryKeys.list(DEMO_CLUB_ID)
  // Refresh even after unmount, so reopening Inventory never briefly shows the old stock.
  const refresh = async () => {
    await client.cancelQueries({ queryKey: key })
    client.setQueryData(key, await getInventory())
    await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  }
  const batch = createDebouncedBatch<string, number>({
    delayMs: 800,
    async send(changes) {
      const callbacks = owner.callbacks
      let message = ''
      try {
        // One write per changed item, in order; each reads the revision the last save returned.
        for (const { key: id, value: stock } of changes) {
          const item = client.getQueryData<AcceptedInventory>(key)?.items.find((i) => i.id === id)
          if (!item) throw new Error('Item not available.')
          const result = await setInventoryStock({ item, stock })
          message = result.message
          const accepted = client.getQueryData<AcceptedInventory>(key)
          if (accepted)
            client.setQueryData(key, {
              ...accepted,
              items: accepted.items.map((i) =>
                i.id === id ? { ...result.data, runningLow: result.data.stock <= 2 } : i,
              ),
            })
        }
      } catch (error) {
        owner.error = error instanceof Error ? error : new Error('Stock could not be saved')
        // Reconcile with what the server kept before the batch rolls back to accepted stock.
        await refresh().catch(() => undefined)
        callbacks.onError?.(owner.error)
        throw error
      }
      await refresh()
      callbacks.onSuccess?.({ message })
    },
  })
  return { batch, owner }
}
const byClient = new WeakMap<QueryClient, ReturnType<typeof createStockBatch>>()

/** Shared intent survives unmounts and never mutates accepted query snapshots until a save lands. */
export function getInventoryStockBatch(client: QueryClient) {
  let shared = byClient.get(client)
  if (!shared) {
    shared = createStockBatch(client)
    byClient.set(client, shared)
  }
  return shared
}
