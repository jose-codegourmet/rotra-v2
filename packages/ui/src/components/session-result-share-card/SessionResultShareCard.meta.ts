import type { ComponentMeta } from '@rotra/ui/meta'
export const sessionResultShareCardMeta = {
  name: 'SessionResultShareCard',
  description: 'SessionResultShareCard for Player Information.',
  usage: ['Use on the matching Player Information screen.'],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Share result' },
  variants: ['Post', 'Story', 'LongTitle'],
} satisfies ComponentMeta
