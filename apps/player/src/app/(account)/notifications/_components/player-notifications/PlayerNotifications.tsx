'use client'

import { useSession } from '@rotra/data/auth/use-session'
import type {
  PlayerNotification,
  PlayerNotificationFilter,
} from '@rotra/data/player-notifications/types'
import {
  useMarkAllPlayerNotificationsRead,
  useMarkPlayerNotificationRead,
} from '@rotra/data/player-notifications/usePlayerNotificationMutations'
import { usePlayerNotifications } from '@rotra/data/player-notifications/usePlayerNotifications'
import { NotificationList, type NotificationListItem } from '@rotra/ui/notification-list'
import { toast } from '@rotra/ui/toaster'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useRequireSignedIn } from '../../../profile/_components/require-signed-in/useRequireSignedIn'

function notificationTimeLabel(createdAt: string, now: number) {
  const minutes = Math.round((now - Date.parse(createdAt)) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}

export function PlayerNotifications() {
  const signedOut = useRequireSignedIn()
  const session = useSession('player')
  const playerId = session.data?.account.id ?? null
  const [filter, setFilter] = useState<PlayerNotificationFilter>('all')
  const notifications = usePlayerNotifications(playerId, filter)
  const markRead = useMarkPlayerNotificationRead(playerId ?? '')
  const markAllRead = useMarkAllPlayerNotificationsRead(playerId ?? '')
  const router = useRouter()

  if (signedOut) return null

  if (!playerId && session.isError) {
    return (
      <NotificationList
        state={{
          kind: 'error',
          retrying: session.isFetching,
          onRetry: () => void session.refetch(),
        }}
      />
    )
  }

  if (notifications.isError) {
    return (
      <NotificationList
        state={{
          kind: 'error',
          retrying: notifications.isFetching,
          onRetry: () => void notifications.refetch(),
        }}
      />
    )
  }

  if (!notifications.data) return <NotificationList state={{ kind: 'loading' }} />

  const { unreadCount, newNotifications, earlierNotifications } = notifications.data
  const now = Date.now()
  const toListItem = (notification: PlayerNotification): NotificationListItem => ({
    id: notification.id,
    kind: notification.kind,
    title: notification.title,
    body: notification.body,
    timeLabel: notificationTimeLabel(notification.createdAt, now),
    read: notification.readAt !== null,
    pinned: notification.pinned,
  })

  return (
    <NotificationList
      filter={filter}
      unreadCount={unreadCount}
      newNotifications={newNotifications.map(toListItem)}
      earlierNotifications={earlierNotifications.map(toListItem)}
      onFilterChange={setFilter}
      onMarkAllRead={() => {
        if (markAllRead.isPending) return
        markAllRead.mutate(undefined, {
          onSuccess: () => toast('All marked as read'),
          onError: (error) => toast.error(error.message),
        })
      }}
      onOpen={(id) => {
        const notification =
          newNotifications.find((item) => item.id === id) ??
          earlierNotifications.find((item) => item.id === id)
        if (!notification || markRead.isPending) return
        const openTarget = () => router.push(notification.target)
        if (notification.readAt !== null) {
          openTarget()
          return
        }
        markRead.mutate(id, {
          onSuccess: openTarget,
          onError: (error) => toast.error(error.message),
        })
      }}
    />
  )
}
