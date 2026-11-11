import type { ComponentMeta } from '@rotra/ui/meta'

export const clubPageHeroMeta = {
  name: 'ClubPageHero',
  description:
    'The public club page hero card: the club mark and name side by side (no banner), a chip row (city, members, Playing now or Next DATE), Join this club and Share club page, and three stat cards.',
  usage: [
    'Use once at the top of P-CLUB-PAGE. Banners are a player-profile thing only.',
    'Join this club is a link to the club’s current invite link; Share club page reports onShare (the container copies the page link and toasts).',
    'Stat cards stack one per row on phones; the actions move top right from 920 px.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-CLUB-PAGE › .club-hero, .club-stats, .stat-card',
  },
  docs: ['docs/screens/product/modules/player-information/club-page.md'],
  variants: ['scheduled', 'live', 'nothing-scheduled', 'no-members'],
  related: ['ClubNextUpCard', 'ClubMemberGrid', 'Avatar'],
} satisfies ComponentMeta
