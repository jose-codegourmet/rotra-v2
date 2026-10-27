import type { QueryClient } from '@tanstack/react-query'
import { connectMockSync } from '../sync/fetchers'
import { mockStore } from './store'
/** Bridge store resets and simulated reconnects into all mounted domain queries. */
export function connectMockQueryClient(client: QueryClient) {
  const unsubscribe = mockStore.subscribe(() => {
    void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  })
  const disconnect = connectMockSync()
  return () => {
    unsubscribe()
    disconnect()
  }
}
