import type { ComponentMeta } from '@rotra/ui/meta'
export const gameRowMeta = {
  name: 'GameRow',
  description:
    'One official player game drawn as a small badminton court: faces and first names on each side, the score and Won / Lost on the net.',
  usage: [
    'Pass `me` (label “You” on your own profile) so the profile owner is drawn first on the left.',
    'Pass `onOpenPlayer` to make every face a button that opens the profile card; a face with no playerId is a guest (Not on ROTRA yet).',
    'Each face shows its games badge from `sessionGameNumber` (the game’s own for the owner, each player’s for the others): how many games they had played in that session, this one included.',
    'Pass `onShare` only on your own games: the round share icon opens Share game. Partial games never show it.',
    'A game with `counting: "not_ranked"` (a session run with Record games off, D-2026-11-20-02) keeps Won / Lost and the share icon and shows “Not ranked session · doesn’t count toward win rate or the leaderboards” under the court, without “· not counted”. The note is NOT_RANKED_NOTE; a partial game’s own note still ends “· not counted”.',
    'Read-only: no result editing controls. A thin mapping onto MatchCourt’s Player variant; the court art lives there only.',
    'Best of 3 (Q22): set `game.gameScores` (read from the player’s side) and `game.score` to the games won; each game score shows in a pill under the format pill.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Games, Profile › Recent games, session matches dialog (gameRow)',
  },
  docs: [
    'docs/screens/product/modules/player-information/ranking-history.md',
    'docs/mockup-changes/2026-11-13-player-game-row-court.md',
    'docs/mockup-changes/2026-11-14-player-game-row-games-badge.md',
    'docs/mockup-changes/2026-11-20-player-not-ranked-games.md',
  ],
  variants: ['won', 'lost', 'no score', 'fun', 'partial with note', 'not ranked', 'best of 3'],
  related: ['MatchCourt'],
} satisfies ComponentMeta
