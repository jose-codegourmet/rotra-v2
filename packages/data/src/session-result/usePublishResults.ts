'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queueSessionKeys } from '../queue-session/queryKeys'
import { syncKeys } from '../sync/queryKeys'
import { publishResults } from './fetchers'
import { sessionResultKeys } from './queryKeys'
/**
 * Publish or update the publication. Refreshes the publication, results, the session record and the
 * session detail that backs the public page (the public session page reads the same queue-session keys).
 */
export function usePublishResults() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: publishResults,
    onSuccess: async (outcome) => {
      const id = outcome.data.sessionId
      client.setQueryData(sessionResultKeys.publication(id), outcome.data)
      await Promise.all([
        client.invalidateQueries({ queryKey: sessionResultKeys.publication(id) }),
        client.invalidateQueries({ queryKey: sessionResultKeys.snapshot(id) }),
        client.invalidateQueries({ queryKey: queueSessionKeys.record(id) }),
        client.invalidateQueries({ queryKey: queueSessionKeys.detail(id) }),
        client.invalidateQueries({ queryKey: syncKeys.all }),
      ])
    },
  })
}
