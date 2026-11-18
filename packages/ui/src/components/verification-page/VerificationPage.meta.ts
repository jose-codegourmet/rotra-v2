import type { ComponentMeta } from '@rotra/ui/meta'

export const verificationPageMeta = {
  name: 'VerificationPage',
  description: "The player's own Verification page, with status, steps and the Why verify? card.",
  usage: [
    'Render only for the signed-in player. Pass their private verification status and the formatted deadline.',
    'Pass the Google and contact change callbacks from the container.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION (viewVerify)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: ['loading', 'error', 'ready'],
  related: ['PageHeader', 'VerificationCard', 'VerificationStep'],
} satisfies ComponentMeta
