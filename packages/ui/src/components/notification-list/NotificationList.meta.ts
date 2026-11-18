import type { ComponentMeta } from '@rotra/ui/meta'

export const notificationListMeta = {
  name: 'NotificationList',
  description: 'The Player Information Notifications page with its filter and grouped card lists.',
  usage: [
    'Pass the New and Earlier groups for the selected filter and the total unread count.',
    'Handle changes to the selected filter, Mark all as read and opening a notification.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-NOTIFICATIONS (viewNotifs)',
  },
  docs: ['docs/screens/product/modules/player-information/notifications.md'],
  related: ['NotificationBell', 'NotificationItem', 'SegmentedControl'],
} satisfies ComponentMeta
