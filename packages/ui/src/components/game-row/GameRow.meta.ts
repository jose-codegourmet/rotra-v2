import type { ComponentMeta } from '@rotra/ui/meta'
export const gameRowMeta = {
  name: 'GameRow',
  description:
    'One official player game drawn as a small badminton court: faces and first names on each side, the score and Won / Lost on the net.',
  usage: [
    'Pass `me` (label “You” on your own profile) so the profile owner is drawn first on the left.',
    'Pass `onOpenPlayer` to make every face a button that opens the profile card; a face with no playerId is a guest (Not on ROTRA yet).',
    'Pass `onShare` only on your own games: the round share icon opens Share game. Partial games never show it.',
    'Read-only: no result editing controls.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games, Profile › Recent games, session matches dialog (gameRow)',
  },
  docs: [
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
  ],
} satisfies ComponentMeta
