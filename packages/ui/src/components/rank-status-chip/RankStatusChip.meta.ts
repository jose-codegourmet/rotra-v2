import type { ComponentMeta } from '@rotra/ui/meta'

export const rankStatusChipMeta = {
  name: 'RankStatusChip',
  description:
    "A player's overall ROTRA leaderboard status in the Admin Players list and player detail: No rank yet, Below requirement (too few recent matches), On leaderboard or Not on leaderboard (an unclaimed player saved by more than one club).",
  usage: [
    'Pass the computed PlayerRankStatus; the chip does no rank math (A03.5 computes it from the ranking configuration in effect).',
    'Read-only context: Admin never edits a rank from here.',
    'Pass notOnLeaderboard for an unclaimed player saved by more than one club (D-2026-11-16-04); the rank text then reads "<Level> · not on the leaderboard until they register" from the data layer.',
    'Always carries its text; On leaderboard is accent, the others neutral.',
  ],
  prototype: {
    file: 'apps/mockup/admin-app/rotra-admin.html',
    screen: 'A-PLAYERS › viewPlayers() › td[data-label="Rank"] (rankOf().chip)',
  },
  docs: ['docs/screens/product/modules/admin/players-requests.md'],
  variants: ['none', 'below', 'board', 'not-on-leaderboard'],
  related: ['Chip', 'PlayerAccountChip', 'PlayerIdentityCell'],
} satisfies ComponentMeta
