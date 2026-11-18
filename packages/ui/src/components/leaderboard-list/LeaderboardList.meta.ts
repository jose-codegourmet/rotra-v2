import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardListMeta = {
  name: 'LeaderboardList',
  description:
    'The Wins heading, loading state and incremental footer for Top annual, Top monthly and Top weekly.',
  usage: [
    'Pass the current period and its LeaderboardRow children after the list loads.',
    'Use loading while the leaderboard query is pending.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › lbHead and list footer',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['default', 'loading', 'has-more', 'refreshing'],
  related: ['LeaderboardRow', 'Skeleton'],
} satisfies ComponentMeta
