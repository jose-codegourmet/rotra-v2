import type { ComponentMeta } from '@rotra/ui/meta'

export const profileRankingCardMeta = {
  name: 'ProfileRankingCard',
  description:
    'Shared rank and one button for each leaderboard where the player is in the top 50. Each button shows the period, place and wins.',
  usage: [
    'Pass leaderboardPlaces from the player profile, including an empty array when they are in no top 50.',
    'onOpenLeaderboard receives the selected period so the container can open that list at the player’s row.',
    'Pass onShare on your own profile with a rank.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-PUBLIC-PROFILE and P-OWN-PROFILE › eligibility(), lbBoxes()',
  },
  docs: [
    'docs/screens/product/modules/player-information/profile.md#profile-states',
    'docs/mockup-changes/2026-11-16-player-leaderboard-periods.md',
  ],
  variants: ['one list', 'two lists', 'three lists', 'no lists'],
  related: ['LeaderboardRow', 'RankShareCard'],
} satisfies ComponentMeta
