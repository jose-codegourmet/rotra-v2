import type { ComponentMeta } from '@rotra/ui/meta'

export const genderChipsMeta = {
  name: 'GenderChips',
  description:
    'The Gender · public chips (Male, Female) of the onboarding Your details step, with the match-category hint.',
  usage: [
    'One pick; tapping the picked chip keeps it (the answer is required when registering).',
    'required adds the green Required pill; error is "Choose Male or Female." from the form schema.',
    'Edit profile › Name keeps gender as its own control (ticket #1089); this is only for registration and the Back to details step.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewClaim › Gender (.ob-chips radiogroup)',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['PickChip', 'ClaimForm', 'YourDetailsForm'],
} satisfies ComponentMeta
