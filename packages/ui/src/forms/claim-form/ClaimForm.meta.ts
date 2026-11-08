import type { ComponentMeta } from '@rotra/ui/meta'
export const claimFormMeta = {
  name: 'ClaimForm',
  description:
    'P-CLAIM step 2, Finish registering: the read-only masked phone, required email and password, and optional personal details.',
  usage: [
    'standalone opens the empty guest registration form. accountMatch offers sign-in/recovery or editing contacts; it never reveals another profile or links the guest.',
    'The container owns useCompleteClaim, toasts and the next step; the form never mutates.',
    'Submitted values carry email, password and personal details, never the phone.',
    'No SMS step, Facebook authorization, age, gear, tournament or self-rating field.',
    'Password has no minimum length until the auth specification sets one.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'viewClaim › Finish registering (FORM.claim)',
  },
  docs: ['docs/screens/product/modules/player-information/access-registration.md'],
  related: ['ClaimIdentityCheck', 'PersonalDetailsFields', 'AccountLinkStatus'],
} satisfies ComponentMeta
