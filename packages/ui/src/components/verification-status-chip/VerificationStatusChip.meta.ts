import type { ComponentMeta } from '@rotra/ui/meta'

export const verificationStatusChipMeta = {
  name: 'VerificationStatusChip',
  description: 'The Player Information account verification label with the completed step count.',
  usage: [
    'Use in VerificationCard and on the player’s own profile.',
    'Pass the completed step count and whether ROTRA Admin verified the account.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION and own profile (verifyChip)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: ['not-verified', 'verified', 'verified-by-admin'],
  related: ['Chip', 'VerificationCard'],
} satisfies ComponentMeta
