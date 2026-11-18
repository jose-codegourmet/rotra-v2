import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardRulesCardMeta = {
  name: 'LeaderboardRulesCard',
  description:
    'Explains the three leaderboard periods, which games count and what a movement mark means.',
  usage: [
    'Use below the leaderboard.',
    'Includes the line about players marked Not registered yet (saved by one club, not registered with ROTRA; a player saved by more than one club joins the list after they register).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD Who appears here',
  },
} satisfies ComponentMeta
