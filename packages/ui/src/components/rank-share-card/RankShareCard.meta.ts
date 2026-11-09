import type { ComponentMeta } from '@rotra/ui/meta'
export const rankShareCardMeta = {
  name: 'RankShareCard',
  description: 'RankShareCard for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Shared rank › Share' },
  variants: ['Post', 'Story', 'NoPosition', 'WebShare'],
} satisfies ComponentMeta
