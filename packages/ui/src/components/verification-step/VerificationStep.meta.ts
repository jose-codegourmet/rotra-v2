import type { ComponentMeta } from '@rotra/ui/meta'

export const verificationStepMeta = {
  name: 'VerificationStep',
  description: 'A numbered account verification step with a status line and optional actions or chip.',
  usage: [
    'Use for each of the three checks in VerificationCard.',
    'Pass the check result to show a check mark on completed steps.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION (verifyCard step row)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: ['todo', 'done'],
  related: ['VerificationCard', 'Chip', 'Button'],
} satisfies ComponentMeta
