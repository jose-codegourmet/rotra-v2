'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accountVerificationKeys } from '../account-verification/queryKeys'
import { submitContactChangeRequest } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'
export function useSubmitContactChangeRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: submitContactChangeRequest,
    networkMode: 'always',
    onSuccess: ({ playerId }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: contactChangeRequestKeys.all }),
        client.invalidateQueries({ queryKey: accountVerificationKeys.owner(playerId) }),
      ]),
  })
}
