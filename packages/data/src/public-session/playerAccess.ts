'use client'
import { useQuery } from '@tanstack/react-query'
import { playerOrigin } from './context'
import type { PlayerSessionAccess } from './publicSession.types'

/** Same-site, cross-origin browser read. No Supabase session or token is copied into Queue. */
export function usePlayerSessionAccess(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['player-session-access', slug],
    queryFn: async ({ signal }): Promise<PlayerSessionAccess | null> => {
      const origin = playerOrigin(location.origin)
      if (!origin) return null
      const response = await fetch(
        `${origin}/api/public-sessions/${encodeURIComponent(slug)}/access`,
        {
          credentials: 'include',
          cache: 'no-store',
          signal,
        },
      )
      if (response.status === 401 || response.status === 403 || response.status === 404) return null
      if (!response.ok) throw new Error("Couldn't check Player access. Try again.")
      return response.json()
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 15_000,
  })
}
