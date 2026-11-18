import type { ComponentMeta } from '@rotra/ui/meta'

export const notificationBellMeta = {
  name: 'NotificationBell',
  description: 'The Player Information top-bar bell with the unread notification count.',
  usage: [
    'Show before the theme button for a signed-in player.',
    'Pass the total unread count and set current on the Notifications page.',
    'Pass the Notifications link or an onNavigate callback when navigation needs confirmation.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Player top bar (topBar)',
  },
  docs: ['docs/screens/product/modules/player-information/notifications.md'],
  related: ['Button', 'NotificationList', 'PlayerNav'],
} satisfies ComponentMeta
