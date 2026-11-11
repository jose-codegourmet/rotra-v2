import type { ComponentMeta } from '@rotra/ui/meta'

export const clubMemberGridMeta = {
  name: 'ClubMemberGrid',
  description:
    "The public club page's Members card: a four-across grid of round avatars with names and levels, Show more (12 at a time) and See all N.",
  usage: [
    'Registered members only; the container applies the masking rules. A masked member (visitors, always-private) is shown without a button.',
    'Signed out shows the hint “Names are masked. Sign in with ROTRA to see them.”',
    'A tap reports onOpen(key); the container opens ClubMemberProfileSheet.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › Members (.mgrid, .mcell)',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['signed-in', 'signed-out', 'show-more', 'empty'],
  related: ['ClubMemberList', 'ClubMemberProfileSheet', 'Avatar'],
} satisfies ComponentMeta
