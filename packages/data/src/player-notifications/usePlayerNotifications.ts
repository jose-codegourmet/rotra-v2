'use client'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { getPlayerNotifications } from './fetchers'
import {
  groupPlayerNotifications,
  playerNotificationUnreadCount,
} from './playerNotifications.rules'
import type { PlayerNotificationFilter } from './playerNotifications.types'
import { playerNotificationKeys } from './queryKeys'

function notificationOptions(signedInPlayerId: string | null) {
  const playerId = signedInPlayerId ?? ''
  return queryOptions({
    queryKey: playerNotificationKeys.owner(playerId),
    queryFn: ({ signal }) => getPlayerNotifications(playerId, signal),
    enabled: Boolean(signedInPlayerId),
    networkMode: 'always',
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
}

export function usePlayerNotifications(
  signedInPlayerId: string | null,
  filter: PlayerNotificationFilter = 'all',
) {
  return useQuery({
    ...notificationOptions(signedInPlayerId),
    select: (notifications) => groupPlayerNotifications(notifications, filter),
  })
}

export function usePlayerNotificationUnreadCount(signedInPlayerId: string | null) {
  return useQuery({
    ...notificationOptions(signedInPlayerId),
    select: playerNotificationUnreadCount,
  })
}
