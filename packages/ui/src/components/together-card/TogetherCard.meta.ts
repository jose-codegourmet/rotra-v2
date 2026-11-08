import type { ComponentMeta } from '@rotra/ui/meta'

export const togetherCardMeta = {
  name: 'TogetherCard',
  description:
    'Same-team results with overlapped pictures, Games/Won/Lost tiles and team win rate.',
  usage: [
    'Use on P-COMPARE for counted singles and doubles; pass display data and callbacks from the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-COMPARE › You and another player',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['results', 'empty'],
  related: ['CompareFilterBar', 'CompareStats'],
} satisfies ComponentMeta
