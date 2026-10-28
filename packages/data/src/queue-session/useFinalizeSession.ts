'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clubKeys } from '../club/queryKeys'
import { deviceKeys } from '../device/queryKeys'
import { matchKeys } from '../match/queryKeys'
import { sessionRosterKeys } from '../session-roster/queryKeys'
import { syncKeys } from '../sync/queryKeys'
import { finalizeSession } from './finalization'
import { queueSessionKeys } from './queryKeys'
/**
 * Session done; a failed or committed-but-unfinished attempt also refreshes the finalization status.
 * Keyed per session (queueSessionKeys.finalize) so the finishing route can see a run in flight with
 * useIsMutating, even after the console that started it has unmounted.
 */
export function useFinalizeSession(sessionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: queueSessionKeys.finalize(sessionId),
    mutationFn: finalizeSession,
    onSuccess: (outcome) =>
      client.setQueryData(queueSessionKeys.finalization(outcome.data.sessionId), outcome.data),
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: queueSessionKeys.all }),
        client.invalidateQueries({ queryKey: matchKeys.all }),
        client.invalidateQueries({ queryKey: sessionRosterKeys.all }),
        client.invalidateQueries({ queryKey: syncKeys.all }),
        client.invalidateQueries({ queryKey: clubKeys.all }),
        client.invalidateQueries({ queryKey: deviceKeys.all }),
      ])
    },
  })
}
