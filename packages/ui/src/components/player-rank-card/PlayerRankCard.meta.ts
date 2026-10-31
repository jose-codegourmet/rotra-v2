import type { ComponentMeta } from '@rotra/ui/meta'

export const playerRankCardMeta = {
  name: 'PlayerRankCard',
  description:
    "The Rank and games card on the Admin player detail: the player's level and leaderboard standing, and their recent complete standard matches against the requirement.",
  usage: [
    'Pass the computed PlayerRankStatus, level, recent-match count and the match requirement in effect; the card does no rank math (A03.5).',
    'Read-only by design: no rank editor, winner or score edit, or history rebuild (not authorized).',
    'The row chip for the same status is RankStatusChip.',
  ],
  prototype: {
    file: 'app/mocksups-app/admin-app/rotra-admin.html',
    screen: 'A-PLAYER-DETAIL › viewPlayer() › Rank and games (rankOf().text)',
  },
  docs: [
    'docs/screens/product/modules/admin/players-requests.md',
    'docs/business_logic/product/admin/modules/player-management/README.md',
  ],
  variants: ['board', 'below', 'none'],
  related: ['KeyValueList', 'Card', 'RankStatusChip', 'LevelPill'],
} satisfies ComponentMeta
