import type { ComponentMeta } from '@rotra/ui/meta'
export const claimIdentityCheckMeta = {
  name: 'ClaimIdentityCheck',
  description:
    "P-CLAIM step 1, 'Is this you?': the club-created identity with its player ID and a partly hidden email, then Yes, this is me or This isn't me.",
  usage: [
    'Only a registration link opens this; a public RTR ID or profile page never starts a claim.',
    'The email is passed already masked (maskEmail from @rotra/data/player-account/rules); never pass the full address. The record is found by its email (D-2026-11-16-04), so the card shows the email, not the phone.',
    "A guest's own invite link (D-2026-11-18-07) opens a record with a name only: pass maskedEmail '' and the Email row is left out (with no RTR ID yet, the card shows just the name and the two buttons).",
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewClaim › Is this you?',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['ClaimForm', 'AccountLinkStatus', 'LinkPage'],
} satisfies ComponentMeta
