import type { QueryClient } from '@tanstack/react-query'
import { isRealDataMode } from '../real/mode'
import { connectRealSync } from '../real/sync'
import { connectMockSync } from '../sync/fetchers'
import { mockStore } from './store'
/** Bridge store resets and simulated reconnects into all mounted domain queries. */
export function connectMockQueryClient(client: QueryClient) {
  // Real data mode has no mock store to bridge (and any write to it refuses); only connectivity.
  if (isRealDataMode()) return connectRealSync(client)
  const unsubscribe = mockStore.subscribe(() => {
    void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  })
  const disconnect = connectMockSync()
  return () => {
    unsubscribe()
    disconnect()
  }
}
