import type { ComponentMeta } from '@rotra/ui/meta'
export const playerProfileMeta = {
  name: 'PlayerProfile',
  description:
    'Public destination for leaderboard and RTR ID links: identity, shared rank, eligibility, recent games and optional playing details.',
  usage: [
    'Public fields only. Private account, edit and ID/QR screens remain in the P02/P04 tickets.',
  ],
  prototype: { file: 'docs/frames/player-app/rotra-player.html', screen: 'P-PUBLIC-PROFILE' },
  docs: ['docs/screens/product/modules/player-information/profile.md'],
  variants: ['public', 'loading', 'not-found', 'error', 'cached'],
} satisfies ComponentMeta
