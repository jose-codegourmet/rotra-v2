import type { ComponentMeta } from '@rotra/ui/meta'

export const playerAccountChipMeta = {
  name: 'PlayerAccountChip',
  description:
    "A player's account state in the Admin Players list and player detail: Registered (claimed Player Information account) or Unclaimed (the club created the profile; the player hasn't finished registering).",
  usage: [
    'Pass claimed; the chip only formats it.',
    'Wraps IdentityChip so Admin and Queue use the same words and tones. Queue screens that also show Guest or Lookup pending use IdentityChip directly.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-PLAYERS › viewPlayers() › td[data-label="Account"]',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md', 'docs/product-terms.md'],
  variants: ['registered', 'unclaimed'],
  related: ['IdentityChip', 'RankStatusChip', 'PlayerIdentityCell'],
} satisfies ComponentMeta
