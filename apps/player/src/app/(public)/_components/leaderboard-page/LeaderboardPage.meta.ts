import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardPageMeta = {
  name: 'LeaderboardPage',
  description:
    'Connects the three public leaderboards to period standings, the signed-in player’s place and search.',
  usage: [
    'Use ?period=year|month|week&player=<id> to open a period and focus a player’s row.',
    'Public home. A podium spot or a row opens the profile card (ProfileCard) first; its Open ROTRA profile goes to the profile page. The full-RTR-ID search and Open my profile still go straight to the page.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'P-LEADERBOARD' },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: ['LeaderboardPeriodSwitch', 'TopThreePodium', 'LeaderboardList', 'MyPositionCard'],
} satisfies ComponentMeta
