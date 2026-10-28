import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdentityCardMeta = {
  name: 'PlayerIdentityCard', description: 'Public profile identity and permanent RTR ID, with an optional ownership label.', usage: ['Use for public Player Information profiles; never pass private contact data.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
