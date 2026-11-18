import type { PlayerNotification } from '../player-notifications/playerNotifications.types'
import { realRequest } from './client'

const path = '/api/me/notifications'

export async function realPlayerNotifications(playerId: string, signal?: AbortSignal) {
  const result = await realRequest<{ playerId: string; notifications: PlayerNotification[] }>(
    path,
    { signal },
  )
  return result.playerId === playerId ? result.notifications : []
}

export async function realNotificationUnreadCount(playerId: string, signal?: AbortSignal) {
  const result = await realRequest<{ playerId: string; unreadCount: number }>(
    `${path}/unread-count`,
    { signal },
  )
  return result.playerId === playerId ? result.unreadCount : 0
}

export async function realMarkNotificationsRead(playerId: string, id?: string) {
  await realRequest(id === undefined ? path : `${path}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { playerId },
  })
}
