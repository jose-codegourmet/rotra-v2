import type { ComponentMeta } from '@rotra/ui/meta'
export const claimIdentityCheckMeta = {
  name: 'ClaimIdentityCheck',
  description:
    "P-CLAIM step 1, 'Is this you?': the club-created identity with its player ID and a partly hidden phone, then Yes, this is me or This isn't me.",
  usage: [
    'Only a registration link opens this; a public RTR ID or profile page never starts a claim.',
    'The phone is passed already masked by the data layer; never pass the full number.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen: 'viewClaim › Is this you?',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['ClaimForm', 'AccountLinkStatus', 'LinkPage'],
} satisfies ComponentMeta
