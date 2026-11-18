import type { ComponentMeta } from '@rotra/ui/meta'

export const myPositionCardMeta = {
  name: 'MyPositionCard',
  description:
    'The signed-in player’s leaderboard place, wins and movement, or their wins compared with place 50 when they are below the top 50.',
  usage: [
    'Use on the leaderboard only for a signed-in player.',
    'Pass cutoffWins when the player is below place 50.',
    'When the player has no qualifying matches, show the empty state for that period.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › meCard()',
  },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  variants: ['listed', 'below-top-50', 'no-position'],
  related: ['LeaderboardMove', 'LeaderboardList'],
} satisfies ComponentMeta
