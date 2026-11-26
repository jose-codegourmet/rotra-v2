import type { ComponentMeta } from '@rotra/ui/meta'

export const playerAccountChipMeta = {
  name: 'PlayerAccountChip',
  description:
    "A player's account state in the Admin Players list and player detail: Registered (claimed Player Information account), Verified / Verified by Admin (registered and verified, D-2026-11-23-07), Registered + Not verified · N of 3, or Unclaimed (the club created the profile; the player hasn't finished registering).",
  usage: [
    'Pass claimed and, for a registered player, the derived verification; the chip only formats them.',
    'Wraps IdentityChip so Admin and Queue use the same words and tones. Queue screens that also show Guest or Lookup pending use IdentityChip directly.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-PLAYERS › viewPlayers() and viewPlayer() › accountChips()',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md', 'docs/product-terms.md'],
  variants: ['registered', 'verified', 'verified-by-admin', 'not-verified', 'unclaimed'],
  related: ['IdentityChip', 'VerificationStatusChip', 'RankStatusChip', 'PlayerIdentityCell'],
} satisfies ComponentMeta
