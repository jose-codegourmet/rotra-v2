import type { ComponentMeta } from '@rotra/ui/meta'
export const playerClubsCardMeta = {
  name: 'PlayerClubsCard',
  description:
    'The clubs card on a player profile (#766): "Your clubs" on the own profile, "Clubs" on another player\'s. Each club is one row that links to its club page: logo, then name.',
  usage: [
    'Use on P-OWN-PROFILE and P-PUBLIC-PROFILE whenever the profile is readable.',
    'isOwn shows the "Your clubs" heading and the muted joined-via line; another player\'s rows never carry joinedVia.',
    'An unclaimed player\'s card lists the one club that saved them (no joinedVia), instead of "No clubs yet.".',
    'isHost shows the accent Host chip under the club name (#1007, D-2026-11-22-01): the player is a current trusted host of that club. It is informational, never a permission, and shows only where the card shows.',
    'Leave club lives on the club page hero; there is no Report a problem.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-PROFILE › clubsPanel()',
  },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: [
    'TwoClubs',
    'OtherPlayer',
    'HostBadge',
    'HostBadgeOtherPlayerLight',
    'Empty',
    'OtherPlayerEmpty',
    'UnclaimedSavedByOneClub',
    'UnclaimedSavedByOneClubLight',
    'LongName',
    'TwoClubsLight',
    'OtherPlayerLight',
    'OtherPlayerEmptyLight',
  ],
  related: ['Chip', 'ClubLogo', 'ClubPageHero'],
} satisfies ComponentMeta
