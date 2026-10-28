import type { ComponentMeta } from '@rotra/ui/meta'
export const playerAboutCardMeta = {
  name: 'PlayerAboutCard',
  description: 'Optional public playing details and prototype social-link visibility.',
  usage: ['Use for public Player Information profiles; never pass private contact data.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
