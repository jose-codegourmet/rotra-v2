import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardRulesCardMeta = {
  name: 'LeaderboardRulesCard',
  description:
    'Explains the three leaderboard periods, which games count and what a movement mark means.',
  usage: ['Use below the leaderboard.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD Who appears here',
  },
} satisfies ComponentMeta
