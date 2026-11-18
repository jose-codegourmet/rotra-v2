import type { ComponentMeta } from '@rotra/ui/meta'

export const playerNotificationsMeta = {
  name: 'PlayerNotifications',
  description: "Wires the signed-in player's Notifications page, read actions and destinations.",
  usage: [
    'Mount on /notifications behind the Player sign-in guard.',
    'Wires loading, failed reads and Retry to the NotificationList states.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'P-NOTIFICATIONS' },
  docs: ['docs/screens/product/modules/player-information/notifications.md'],
  related: ['NotificationList', 'NotificationBell'],
} satisfies ComponentMeta
