'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { resetPassword } from './fetchers'
import { playerAccountKeys } from './queryKeys'
export function useResetPassword() {
  const client = useQueryClient()
  return useMutation({ mutationFn: resetPassword, onSuccess: () => client.invalidateQueries({ queryKey: playerAccountKeys.all }) })
}
