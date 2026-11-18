'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { markAllPlayerNotificationsRead, markPlayerNotificationRead } from './fetchers'
import { playerNotificationKeys } from './queryKeys'

export function useMarkPlayerNotificationRead(playerId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => markPlayerNotificationRead(playerId, notificationId),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: playerNotificationKeys.owner(playerId) }),
  })
}

export function useMarkAllPlayerNotificationsRead(playerId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => markAllPlayerNotificationsRead(playerId),
    networkMode: 'always',
    onSuccess: () => client.invalidateQueries({ queryKey: playerNotificationKeys.owner(playerId) }),
  })
}
