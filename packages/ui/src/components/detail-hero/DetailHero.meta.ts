import type { ComponentMeta } from '@rotra/ui/meta'

export const detailHeroMeta = {
  name: 'DetailHero',
  description:
    'The hero at the top of an Admin detail page: the club logo or player picture, the name as the page heading, and a row of state chips under it.',
  usage: [
    'Use once per Admin detail page (club detail, player detail).',
    'media is ClubLogo size="lg" or Avatar size={52}; meta is a row of chips, a running-session dot or a mono RTR ID.',
    'The title is the page h1 and wraps anywhere, so long names never push the page sideways.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-CLUB-DETAIL › viewClub() .hero; A-PLAYER-DETAIL › viewPlayer() .hero',
  },
  docs: [
    'docs/screens/product/modules/admin/clubs-licenses.md',
    'docs/screens/product/modules/admin/players-requests.md',
  ],
  related: ['ClubLogo', 'Avatar', 'LicenseAccessChip', 'Chip', 'PageHeader'],
} satisfies ComponentMeta
