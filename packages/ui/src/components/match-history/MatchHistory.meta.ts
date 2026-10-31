import type { ComponentMeta } from '@rotra/ui/meta'
export const matchHistoryMeta = {
  name: 'MatchHistory',
  description: 'Official read-only player game history.',
  usage: [
    'Prototype placeholder for open public history/social visibility: show partner and opponent names, with fun and partial games in a separate tab.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'Games and Profile › Recent games',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
} satisfies ComponentMeta
