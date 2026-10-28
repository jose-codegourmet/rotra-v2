import type { ComponentMeta } from '@rotra/ui/meta'
export const gameHistoryMeta = {
  name: 'GameHistory',
  description: 'Connects official public game records to counted and fun/partial history tabs.',
  usage: ['Read-only; unknown identities never fall back to another player.'],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-MATCH-HISTORY' },
  variants: ['counted', 'fun-partial', 'loading', 'empty', 'error', 'not-found', 'offline'],
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['MatchHistory', 'ProfileNotFound'],
} satisfies ComponentMeta
