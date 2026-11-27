'use client'
import { useQuery } from '@tanstack/react-query'
import { getMySessions, type MySession } from './mySessions'
import { playerSessionSlot } from './player.rules'
import { playerKeys } from './queryKeys'

const SESSION_SLOT_REFRESH_MS = 60_000

type MySessionsOptions = {
  /** Refresh the shared query while the navigation slot is Play or Ready. */
  refreshSessionSlot?: boolean
}

export function useMySessions(id: string | null, { refreshSessionSlot }: MySessionsOptions = {}) {
  const shouldRefresh = (sessions: readonly MySession[] | undefined) => {
    if (!refreshSessionSlot || !sessions) return false
    const slot = playerSessionSlot(sessions, Date.now())
    return slot?.kind === 'play' || slot?.kind === 'ready'
  }

  return useQuery({
    queryKey: playerKeys.mySessions(id ?? ''),
    queryFn: ({ signal }) => getMySessions(signal),
    enabled: !!id,
    networkMode: 'always',
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: (query) => (shouldRefresh(query.state.data?.sessions) ? 'always' : false),
    refetchOnReconnect: false,
    refetchInterval: (query) =>
      shouldRefresh(query.state.data?.sessions) ? SESSION_SLOT_REFRESH_MS : false,
  })
}
