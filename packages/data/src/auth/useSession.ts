'use client'
import { useQuery } from '@tanstack/react-query'
import type { AuthAudience } from './auth.types'
import { getSession } from './fetchers'
import { authKeys } from './queryKeys'
export function useSession(audience: AuthAudience) {
  return useQuery({ queryKey: authKeys.session(audience), queryFn: () => getSession(audience) })
}
