'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmMockEmail } from './emailConfirmation'
import { playerAccountKeys } from './queryKeys'
export function useConfirmMockEmail() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: confirmMockEmail,
    networkMode: 'always',
    onSuccess: (result) =>
      client.invalidateQueries({ queryKey: playerAccountKeys.me(result.playerId) }),
  })
}
