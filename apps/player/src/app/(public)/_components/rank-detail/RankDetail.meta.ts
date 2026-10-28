import type { ComponentMeta } from '@rotra/ui/meta'
export const rankDetailMeta = {
  name: 'RankDetail',
  description:
    'Connects generic and player-specific rank explanations to configured weights and public rank state.',
  usage: ['Pass playerId only on the player rank route.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-RANK-DETAIL' },
  variants: ['generic', 'player', 'loading', 'error', 'not-found', 'offline'],
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['RankExplanation', 'ProfileNotFound'],
} satisfies ComponentMeta
