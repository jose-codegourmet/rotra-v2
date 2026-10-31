import type { ComponentMeta } from '@rotra/ui/meta'
export const gameRowMeta = {
  name: 'GameRow',
  description: 'Official read-only player game history.',
  usage: ['Display official records without result editing controls.'],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Games and Profile › Recent games',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
} satisfies ComponentMeta
