'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionRosterKeys } from '../session-roster/queryKeys'
import { syncKeys } from '../sync/queryKeys'
import { sendJoinRequest } from './fetchers'
import type { SendJoinRequestInput } from './publicSession.types'
import { publicSessionKeys } from './queryKeys'
/** Request to join: refreshes this visitor's status, the page and the operator's join requests. */
export function useSendJoinRequest(slug: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: SendJoinRequestInput) => sendJoinRequest(slug, input),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: publicSessionKeys.myRequest(slug) }),
        client.invalidateQueries({ queryKey: publicSessionKeys.detail(slug) }),
        client.invalidateQueries({ queryKey: sessionRosterKeys.all }),
        client.invalidateQueries({ queryKey: syncKeys.all }),
      ])
    },
  })
}
