'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setPhonePrivacy } from './fetchers'
import { playerAccountKeys } from './queryKeys'
export function useSetPhonePrivacy() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: setPhonePrivacy,
    networkMode: 'always',
    onSuccess: (account) =>
      client.invalidateQueries({ queryKey: playerAccountKeys.me(account.playerId) }),
  })
}
