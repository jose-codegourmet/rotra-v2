import type { ComponentMeta } from '@rotra/ui/meta'

export const rankStatusChipMeta = {
  name: 'RankStatusChip',
  description:
    "A player's overall ROTRA leaderboard status in the Admin Players list and player detail: No rank yet, Below requirement (too few recent matches) or On leaderboard.",
  usage: [
    'Pass the computed PlayerRankStatus; the chip does no rank math (A03.5 computes it from the ranking configuration in effect).',
    'Read-only context: Admin never edits a rank from here.',
    'Always carries its text; On leaderboard is accent, the others neutral.',
  ],
  prototype: {
    file: 'docs/frames/admin-app/rotra-admin.html',
    screen: 'A-PLAYERS › viewPlayers() › td[data-label="Rank"] (rankOf().chip)',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  variants: ['none', 'below', 'board'],
  related: ['Chip', 'PlayerAccountChip', 'PlayerIdentityCell'],
} satisfies ComponentMeta
