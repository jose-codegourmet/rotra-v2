import type { ComponentMeta } from '@rotra/ui/meta'

export const optionalFoldMeta = {
  name: 'OptionalFold',
  description:
    'A folded card, "Optional · add now or later", that holds the optional fields of Your details. It opens by itself when one of its fields has an error.',
  usage: [
    'Pass hasError when any child field has an error so the player never misses it; keep required fields outside the fold.',
    'Summary reads "Nickname, experience and links, prefilled from your club" for an invite, without the last part for a standalone sign-up.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-ONBOARD step 1 › details.ob-more',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/mockup-changes/2026-11-19-player-details-step-mobile.md',
  ],
  related: ['OnboardingFrame', 'Field', 'Card'],
} satisfies ComponentMeta
