import type { ComponentMeta } from '@rotra/ui/meta'

export const accountVerificationMeta = {
  name: 'AccountVerification',
  description:
    "Loads the signed-in player's verification status and wires the Google and contact change flows.",
  usage: [
    'Use on /profile/verification under the existing /profile proxy boundary.',
    'After a confirmed signed-out session, use the sign-in return route before showing private details.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION (viewVerify)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  related: ['VerificationPage', 'VerificationCard', 'ContactChangeRequestForm'],
} satisfies ComponentMeta
