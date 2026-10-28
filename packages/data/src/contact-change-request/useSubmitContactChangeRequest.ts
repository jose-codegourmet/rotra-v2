'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitContactChangeRequest } from './fetchers'
import { contactChangeRequestKeys } from './queryKeys'
export function useSubmitContactChangeRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: submitContactChangeRequest,
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: contactChangeRequestKeys.all }),
  })
}
