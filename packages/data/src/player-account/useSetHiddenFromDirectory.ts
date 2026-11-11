'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clubPageKeys } from '../club-page/queryKeys'
import { sessionRosterKeys } from '../session-roster/queryKeys'
import { playerAccountKeys } from './queryKeys'
import { setHiddenFromDirectory } from './visibilitySettings'
/** Saves the switch; the directory search and club member lists are refetched once confirmed. */
export function useSetHiddenFromDirectory() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setHiddenFromDirectory,
    networkMode: 'always',
    onSuccess: (account) =>
      Promise.all([
        client.invalidateQueries({ queryKey: playerAccountKeys.me(account.playerId) }),
        client.invalidateQueries({ queryKey: sessionRosterKeys.all }),
        client.invalidateQueries({ queryKey: clubPageKeys.all }),
      ]),
  })
}
