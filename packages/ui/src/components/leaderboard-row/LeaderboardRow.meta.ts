import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardRowMeta = {
  name: 'LeaderboardRow',
  description: 'A player row with a leaderboard place, movement mark, picture, identity and wins.',
  usage: [
    'Supports visitor privacy states for Player Information.',
    'Use inside LeaderboardList for Top annual, Top monthly and Top weekly.',
    'Pass isMe for the signed-in player.',
    'flash: the row a profile’s leaderboard box jumped to gets an accent wash that fades out in about 1.6 s.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › lbRow',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['default', 'me', 'medal-1', 'medal-2', 'medal-3'],
  related: ['LeaderboardList', 'LeaderboardMove', 'Avatar'],
} satisfies ComponentMeta
