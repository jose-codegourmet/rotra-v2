import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardRowMeta = {
  name: 'LeaderboardRow',
  description:
    'A selectable player row with avatar, global position, identity and shared rank; the signed-in player has an inset accent outline and You chip.',
  usage: [
    'Use inside LeaderboardList for the overall ROTRA leaderboard.',
    'Pass isMe for the signed-in player.',
  ],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › lbRow',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['default', 'me', 'medal-1', 'medal-2', 'medal-3'],
  related: ['LeaderboardList', 'Avatar'],
} satisfies ComponentMeta
