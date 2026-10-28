import type { ComponentMeta } from '@rotra/ui/meta'
export const playerIdLineMeta = {
  name: 'PlayerIdLine', description: 'Permanent RTR ID and copy action; the ID always wraps.', usage: ['Use for public Player Information profiles; never pass private contact data.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
} satisfies ComponentMeta
