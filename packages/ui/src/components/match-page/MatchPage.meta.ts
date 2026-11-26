import type { ComponentMeta } from '@rotra/ui/meta'
export const matchPageMeta = {
  name: 'MatchPage',
  description:
    'The public match page: one game as a court with skill-group rings, its session line, and Before this game with every player’s earlier games of that session.',
  usage: [
    'Pass the `useMatchPage` result as `page`: undefined while loading (skeleton), null for Game not found, `error` with `onRetry` when the read failed.',
    'The viewer’s side goes on the left as “You” when `page.viewerPlayerId` played in the match (score and winner turned round when they were on Team B); everyone else sees Team A on the left.',
    '`onShareGame` (match or game id) shows the share icon only on the signed-in player’s own games: the main court and their own earlier games. The main court does not open anything; `onOpenGame` makes the Before this game courts open their match page.',
    '`backLabel` / `onBack`: the page the court was tapped on (a player’s name, Games, Sessions), else Leaderboard.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Match page (viewMatch, /player/matches/<id>)',
  },
  docs: [
    'docs/screens/product/modules/player-information/match-page.md',
    'docs/mockup-changes/2026-11-25-player-match-page.md',
  ],
  variants: [
    'visitor',
    'played in',
    'played on Team B',
    'fun',
    'partial',
    'not ranked',
    'first game',
    'loading',
    'error',
    'not found',
  ],
  related: ['GameRow', 'MatchCourt'],
} satisfies ComponentMeta
