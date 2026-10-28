import type { ComponentMeta } from '@rotra/ui/meta'
export const accountLinkStatusMeta = {
  name: 'AccountLinkStatus',
  description:
    'Every non-form outcome of a reset or registration link: reset email sent, reset link unusable, profile already registered, registration link unusable, wrong profile, still setting up, and registration complete.',
  usage: [
    'Presentational only; containers choose the variant and own mutations and navigation.',
    "No variant shows a phone or email except the email the player just typed in 'reset-sent'.",
    'Reset outcomes sit in AuthCard; registration outcomes use LinkPage, as in the prototype.',
  ],
  prototype: {
    file: 'docs/frames/player-app/rotra-player.html',
    screen:
      'viewForgot (sent), viewReset (invalid), viewClaim (claimed, expired, wrong, processing), viewClaimDone',
  },
  docs: [
    'docs/screens/product/modules/player-information/access-registration.md',
    'docs/business_logic/product/player-information/modules/identity/flow/claim-and-recover.md',
  ],
  variants: [
    'reset-sent',
    'reset-invalid',
    'claim-claimed',
    'claim-expired',
    'claim-wrong',
    'claim-processing',
    'claim-done',
  ],
  related: ['LinkPage', 'ClaimIdentityCheck', 'ClaimForm'],
} satisfies ComponentMeta
