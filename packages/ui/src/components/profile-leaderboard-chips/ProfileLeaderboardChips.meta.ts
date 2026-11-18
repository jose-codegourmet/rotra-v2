import type { ComponentMeta } from '@rotra/ui/meta'

export const profileLeaderboardChipsMeta = {
  name: 'ProfileLeaderboardChips',
  description: 'The player’s places in the top 50 of the annual, monthly and weekly leaderboards.',
  usage: ['Use in the Player profile dialog and the public unclaimed player card.'],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile dialog and unclaimed player card',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  related: ['ClubMemberProfileSheet', 'PlayerIdentityCard', 'ProfileRankingCard'],
} satisfies ComponentMeta
