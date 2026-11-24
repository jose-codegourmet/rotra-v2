import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardRulesCardMeta = {
  name: 'LeaderboardRulesCard',
  description:
    'Explains the three leaderboard periods, which games count and what a movement mark means.',
  usage: [
    'Use below the leaderboard.',
    'What does not count: fun games, partial games after a substitution, games from not-ranked sessions (Record games off, D-2026-11-20-02), and invalid games or sessions.',
    'Includes the line about players marked Not registered yet (saved by one club, not registered with ROTRA; a player saved by more than one club joins the list after they register).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD Who appears here',
  },
} satisfies ComponentMeta
