import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardListMeta = {
  name: 'LeaderboardList',
  description:
    'The column frame, loading state and incremental footer for the overall ROTRA leaderboard.',
  usage: [
    'Pass LeaderboardRow children after leaderboard data loads.',
    'Use loading while the leaderboard query is pending.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › lbHead and list footer',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['default', 'loading', 'has-more', 'refreshing'],
  related: ['LeaderboardRow', 'Skeleton'],
} satisfies ComponentMeta
