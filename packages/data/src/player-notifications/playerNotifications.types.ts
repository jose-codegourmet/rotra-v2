export type PlayerNotificationKind = 'announce' | 'session' | 'invite' | 'club' | 'rank' | 'account'

export type PlayerNotification = {
  id: string
  kind: PlayerNotificationKind
  title: string
  body: string
  target: string
  createdAt: string
  readAt: string | null
  pinned: boolean
}

export type PlayerNotificationFilter = 'all' | 'unread'
