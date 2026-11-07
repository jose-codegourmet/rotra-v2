'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { getSessionRoster } from './fetchers'
import { removeRosterPlayer } from './mutations'
import { sessionRosterKeys } from './queryKeys'

type Roster = Awaited<ReturnType<typeof getSessionRoster>>

/**
 * Removing a roster player hides the row at once (counts and groups derive from the same cached
 * list), restores it if the command is refused, and refetches in the background.
 */
export function useRemoveRosterPlayer() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: removeRosterPlayer,
    onMutate: async ({ sessionId, rosterId }) => {
      const key = sessionRosterKeys.list(sessionId)
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<Roster>(key)
      if (previous)
        client.setQueryData<Roster>(key, {
          ...previous,
          roster: previous.roster.filter((r) => r.id !== rosterId),
        })
      return { previous, key }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous)
    },
    onSettled: () => {
      void client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
    },
  })
}
