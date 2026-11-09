'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resendConfirmationEmail } from './emailConfirmation'
import { playerAccountKeys } from './queryKeys'
export function useResendConfirmationEmail() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: resendConfirmationEmail,
    networkMode: 'always',
    onSuccess: (result) =>
      client.invalidateQueries({ queryKey: playerAccountKeys.me(result.playerId) }),
  })
}
