'use client'
import { useQuery } from '@tanstack/react-query'
import { getPasswordResetRequests } from './fetchers'
export const passwordResetKeys = { all: ['password-reset-requests'] as const }
export function usePasswordResetRequests(page = 1) {
  return useQuery({
    queryKey: [...passwordResetKeys.all, page],
    queryFn: ({ signal }) => getPasswordResetRequests(page, signal),
  })
}
