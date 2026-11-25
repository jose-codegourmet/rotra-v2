import type { ComponentMeta } from '@rotra/ui/meta'
export const clubLeaderboardCardMeta = {
  name: 'ClubLeaderboardCard',
  description:
    "P-CLUB-PAGE › Leaderboard: the club's own leaderboard (only standard-match wins in its sessions) with the four-period switch, the always-on podium and the next 7 players after it.",
  usage: [
    'In the club page’s left column, between Upcoming sessions and the Calendar.',
    'Its period is its own (ClubPage state); See all opens /clubs/[clubId]/leaderboard with the same period, and only shows when the list has players.',
    'States: loading (four skeleton rows, no podium), error with Try again, empty (three empty steps and the empty line), everyone on the podium.',
    'Also exports useClubBoard and ClubLeaderboardRow, shared with ClubLeaderboard (P-CLUB-LEADERBOARD).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › clubBoardCard',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  related: ['LeaderboardPodium', 'LeaderboardPeriodSwitch', 'LeaderboardList', 'LeaderboardRow'],
  variants: ['loading', 'error', 'empty', 'everyone-on-podium', 'rows-after-podium'],
} satisfies ComponentMeta
