'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clubKeys } from '../club/queryKeys'
import { deviceKeys } from '../device/queryKeys'
import { matchKeys } from '../match/queryKeys'
import { sessionRosterKeys } from '../session-roster/queryKeys'
import { syncKeys } from '../sync/queryKeys'
import { invalidateSession } from './finalization'
import { queueSessionKeys } from './queryKeys'
export function useInvalidateSession() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: invalidateSession,
    onSuccess: async () => {
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
