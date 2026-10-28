'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authKeys } from '../auth/queryKeys'
import { playerKeys } from '../player/queryKeys'
import { checkClaimStatus } from './fetchers'
import { playerAccountKeys } from './queryKeys'
export function useCheckClaimStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: checkClaimStatus,
    networkMode: 'always',
    onSuccess: async (result) => {
      if (result.status !== 'done') return
      client.setQueryData(authKeys.session('player'), result.session)
      await Promise.all([
        client.invalidateQueries({ queryKey: playerKeys.all }),
        client.invalidateQueries({ queryKey: playerAccountKeys.all }),
      ])
    },
  })
}
