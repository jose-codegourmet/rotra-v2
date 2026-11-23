import type { ComponentMeta } from '@rotra/ui/meta'

export const verificationStatusChipMeta = {
  name: 'VerificationStatusChip',
  description: 'The Player Information account verification label with the completed step count.',
  usage: [
    'Use in VerificationCard, on the player’s own profile and in Admin (PlayerAccountChip).',
    'On another player’s public profile use PublicVerificationChip: Verified or Not verified only (D-2026-11-23-07).',
    'Pass the completed step count and whether ROTRA Admin verified the account.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'P-VERIFICATION and own profile (verifyChip)',
  },
  docs: ['docs/screens/product/modules/player-information/identity-privacy.md'],
  variants: [
    'not-verified',
    'verified',
    'verified-by-admin',
    'public-verified',
    'public-not-verified',
  ],
  related: ['Chip', 'VerificationCard'],
} satisfies ComponentMeta
