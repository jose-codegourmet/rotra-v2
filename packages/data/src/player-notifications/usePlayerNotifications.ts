'use client'
import { useQuery } from '@tanstack/react-query'
import { getPlayerNotificationUnreadCount, getPlayerNotifications } from './fetchers'
import { groupPlayerNotifications } from './playerNotifications.rules'
import type { PlayerNotificationFilter } from './playerNotifications.types'
import { playerNotificationKeys } from './queryKeys'

const refreshOptions = {
  networkMode: 'always',
  retry: false,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
} as const

export function usePlayerNotifications(
  signedInPlayerId: string | null,
  filter: PlayerNotificationFilter = 'all',
) {
  const playerId = signedInPlayerId ?? ''
  return useQuery({
    ...refreshOptions,
    enabled: Boolean(signedInPlayerId),
    queryKey: playerNotificationKeys.owner(playerId),
    queryFn: ({ signal }) => getPlayerNotifications(playerId, signal),
    select: (notifications) => groupPlayerNotifications(notifications, filter),
  })
}

export function usePlayerNotificationUnreadCount(signedInPlayerId: string | null) {
  const playerId = signedInPlayerId ?? ''
  return useQuery({
    ...refreshOptions,
    enabled: Boolean(signedInPlayerId),
    queryKey: [...playerNotificationKeys.owner(playerId), 'unread-count'],
    queryFn: ({ signal }) => getPlayerNotificationUnreadCount(playerId, signal),
  })
}
