import type { ComponentMeta } from '@rotra/ui/meta'

export const sharedGameRowMeta = {
  name: 'SharedGameRow',
  description:
    'A counted shared game in court, session and result columns, plus the SharedGamesList shell and pager.',
  usage: [
    'Use on P-COMPARE for counted singles and doubles; pass display data and callbacks from the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-COMPARE › You and another player',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: [
    'against-won',
    'against-lost',
    'together-won',
    'together-lost',
    'singles',
    'empty',
    'paging',
  ],
  related: ['Avatar', 'SharedGamesList'],
} satisfies ComponentMeta
