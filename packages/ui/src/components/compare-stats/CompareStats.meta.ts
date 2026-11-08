import type { ComponentMeta } from '@rotra/ui/meta'

export const compareStatsMeta = {
  name: 'CompareStats',
  description: 'Side-by-side player values and the selected shared-game record.',
  usage: [
    'Use on P-COMPARE for counted singles and doubles; pass display data and callbacks from the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-COMPARE › You and another player',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['all', 'h2h', 'empty'],
  related: ['CompareFilterBar', 'TogetherCard'],
} satisfies ComponentMeta
