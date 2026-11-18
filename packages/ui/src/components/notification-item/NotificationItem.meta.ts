import type { ComponentMeta } from '@rotra/ui/meta'

export const notificationItemMeta = {
  name: 'NotificationItem',
  description: 'One notification with its kind, title, body, time and unread indicator.',
  usage: [
    'Use inside the New and Earlier groups on the Notifications page.',
    'Pass the display time for regular notifications. Pinned notifications show Until done.',
    'Handle onOpen in the page to mark the item as read and open its destination.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-NOTIFICATIONS (viewNotifs, NOTIF_KIND)',
  },
  docs: ['docs/screens/product/modules/player-information/notifications.md'],
  related: ['NotificationBell', 'NotificationList'],
} satisfies ComponentMeta
