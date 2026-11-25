import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardPageMeta = {
  name: 'LeaderboardPage',
  description:
    'Connects the four ROTRA leaderboards (Top annual, quarterly, monthly, weekly) to period standings, the always-on podium with shared places, the signed-in player’s place and search.',
  usage: [
    'Use ?period=year|quarter|month|week&player=<id> to open a period and focus a player’s row.',
    'The podium (LeaderboardPodium) holds places 1 to 3, so the list starts at place 4; a shared step opens PodiumPlaceDialog.',
    'Public home. A podium spot or a row opens the profile card (ProfileCard) first; its Open ROTRA profile goes to the profile page. The full-RTR-ID search and Open my profile still go straight to the page.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'P-LEADERBOARD' },
  docs: ['docs/screens/product/modules/player-information/ranking-history.md'],
  related: [
    'LeaderboardPeriodSwitch',
    'LeaderboardPodium',
    'TopThreePodium',
    'PodiumPlaceDialog',
    'LeaderboardList',
    'MyPositionCard',
  ],
} satisfies ComponentMeta
