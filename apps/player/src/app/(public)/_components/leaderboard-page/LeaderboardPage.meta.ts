import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardPageMeta = {
  name: 'LeaderboardPage',
  description:
    'Connects the public overall leaderboard to paginated mocks and name or RTR ID search.',
  usage: ['Public home; profile links are supplied by the profile epic.'],
  prototype: { file: 'app/mocksups-app/player-app/rotra-player.html', screen: 'P-LEADERBOARD' },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['TopThreePodium', 'LeaderboardList', 'MyPositionCard'],
} satisfies ComponentMeta
