import type { PlayerNotification, PlayerNotificationFilter } from './playerNotifications.types'

const DAY_MS = 24 * 60 * 60 * 1000
const VISIBILITY_MS = 90 * DAY_MS

export const isPlayerNotificationVisible = (notification: PlayerNotification, now: number) =>
  notification.pinned || now - Date.parse(notification.createdAt) < VISIBILITY_MS

export const playerNotificationUnreadCount = (notifications: readonly PlayerNotification[]) =>
  notifications.filter((notification) => notification.readAt === null).length

export function groupPlayerNotifications(
  notifications: readonly PlayerNotification[],
  filter: PlayerNotificationFilter,
  now = Date.now(),
) {
  const visible = notifications.filter((notification) =>
    isPlayerNotificationVisible(notification, now),
  )
  const unreadCount = playerNotificationUnreadCount(visible)
  const list =
    filter === 'unread' ? visible.filter((notification) => notification.readAt === null) : visible
  const sorted = list.sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
  const newNotifications: PlayerNotification[] = []
  const earlierNotifications: PlayerNotification[] = []
  for (const notification of sorted) {
    const isNew = notification.pinned || now - Date.parse(notification.createdAt) < DAY_MS
    const group = isNew ? newNotifications : earlierNotifications
    group.push(notification)
  }
  return { unreadCount, newNotifications, earlierNotifications }
}
