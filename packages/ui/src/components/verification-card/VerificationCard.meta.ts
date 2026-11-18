import type { ComponentMeta } from '@rotra/ui/meta'

export const verificationCardMeta = {
  name: 'VerificationCard',
  description: 'The Your status card on Verification, with the progress and steps for the player.',
  usage: [
    'Pass the completed step count and the formatted Google sign-in deadline.',
    'Pass the VerificationStep rows in order. Verified by Admin shows the Admin notice in their place.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION (verifyCard)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: ['0 of 3', '1 of 3', '2 of 3', '3 of 3', 'Verified by Admin'],
  related: ['Card', 'VerificationStatusChip', 'VerificationStep', 'ProgressBar', 'Notice'],
} satisfies ComponentMeta
