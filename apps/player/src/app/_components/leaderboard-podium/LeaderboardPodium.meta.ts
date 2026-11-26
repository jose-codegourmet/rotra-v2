import type { ComponentMeta } from '@rotra/ui/meta'
export const leaderboardPodiumMeta = {
  name: 'LeaderboardPodium',
  description:
    'Wires leaderboard rows (ROTRA or a club) to TopThreePodium and PodiumPlaceDialog: places 1 to 3 grouped by the rows’ shared place, empty steps, stacked shared places and the dialog of everyone in one.',
  usage: [
    'Always shown once the list has loaded, also while searching and with an empty list (D-2026-11-25-04).',
    'Pass every loaded row; the list below starts at place 4.',
    'A one-player place or a dialog row opens the profile card, unless the row is `masked` (a profile the viewer may not open).',
    'Also exports leaderboardDateLabel (the period label, e.g. "Oct to Dec 2026") and placeCounts (shared places).',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-LEADERBOARD › podium, lbPlaceSheet',
  },
  docs: [
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/screens/product/modules/player-information/club-page.md',
  ],
  related: ['TopThreePodium', 'PodiumPlaceDialog', 'LeaderboardPage', 'ClubLeaderboardCard'],
} satisfies ComponentMeta
