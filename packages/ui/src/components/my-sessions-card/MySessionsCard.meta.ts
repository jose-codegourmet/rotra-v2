import type { ComponentMeta } from '@rotra/ui/meta'
export const mySessionsCardMeta = {
  name: 'MySessionsCard',
  description: 'MySessionsCard for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Own profile' },
  variants: ['AllStatuses', 'Empty', 'ShareResult', 'LongTitle'],
} satisfies ComponentMeta
