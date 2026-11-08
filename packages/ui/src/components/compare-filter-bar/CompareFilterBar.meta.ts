import type { ComponentMeta } from '@rotra/ui/meta'

export const compareFilterBarMeta = {
  name: 'CompareFilterBar',
  description: 'Counted shared-game filters with All, Head to head and Together counts.',
  usage: [
    'Use on P-COMPARE for counted singles and doubles; pass display data and callbacks from the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-COMPARE › You and another player',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['all', 'h2h', 'together'],
  related: ['CompareStats', 'TogetherCard', 'SharedGamesList'],
} satisfies ComponentMeta
