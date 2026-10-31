import type { ComponentMeta } from '@rotra/ui/meta'
export const linkPageMeta = {
  name: 'LinkPage',
  description:
    'The slim page every registration-link step sits on: an optional label, the heading, a description and the step content.',
  usage: ['Use for P-CLAIM and P-CLAIM-STATUS steps. Recovery screens use AuthCard instead.'],
  prototype: {
    file: 'app/mocksups-app/player-app/rotra-player.html',
    screen: 'viewClaim › wrap()',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['AccountLinkStatus', 'ClaimIdentityCheck', 'ClaimForm'],
} satisfies ComponentMeta
