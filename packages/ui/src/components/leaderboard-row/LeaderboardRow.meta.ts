import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardRowMeta = {
  name: 'LeaderboardRow',
  description:
    'A selectable player row showing global position, identity, nickname and shared rank.',
  usage: [
    'Use inside LeaderboardList for the overall ROTRA leaderboard.',
    'Pass isMe for the signed-in player.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-LEADERBOARD › lbRow' },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['default', 'me', 'medal-1', 'medal-2', 'medal-3'],
  related: ['LeaderboardList', 'Avatar'],
} satisfies ComponentMeta
