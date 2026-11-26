import type { ComponentMeta } from '@rotra/ui/meta'
export const clubLeaderboardMeta = {
  name: 'ClubLeaderboard',
  description:
    "P-CLUB-LEADERBOARD: a club's leaderboard page: back link, the club name as a label, the four-period switch, the podium and one card of rows from place 4 with Show 25 more.",
  usage: [
    'Rendered by /clubs/[clubId]/leaderboard (served per request, never indexed); opened from See all on the club page’s Leaderboard card.',
    '?period=quarter|month|week selects the period (year when missing); switching replaces the URL.',
    'No search, no Your position card, no Who appears here card.',
    'A row or podium place opens ProfileCard, except for a profile the viewer may not open.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-LEADERBOARD › viewClubBoard',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  related: ['ClubLeaderboardCard', 'LeaderboardPodium', 'LeaderboardList'],
  variants: ['loading', 'error', 'not-found', 'empty', 'everyone-on-podium', 'show-more'],
} satisfies ComponentMeta
