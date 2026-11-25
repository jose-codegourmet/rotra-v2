import type { ComponentMeta } from '@rotra/ui/meta'

export const leaderboardProfileMeta = {
  name: 'LeaderboardProfile',
  description:
    "The club's profile sheet on the Leaderboards page: PlayerProfileSheet on useClubPlayers and useClubPlayerYearStats for one saved player, outside any session.",
  usage: [
    "Rendered by Leaderboards for a podium place, a Podium place row or a list row of this club's players; other clubs' players open nothing.",
    'onBackToPlace (opened from the Podium place dialog) makes the footer read Back to place; otherwise Close.',
  ],
  docs: ['docs/screens/product/modules/queue/leaderboards.md#q-leaderboards--leaderboards-page'],
  related: ['Leaderboards', 'PlayerProfileSheet', 'PodiumPlaceDialog'],
} satisfies ComponentMeta
