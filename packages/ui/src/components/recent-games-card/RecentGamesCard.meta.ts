import type { ComponentMeta } from '@rotra/ui/meta'
export const recentGamesCardMeta = {
  name: 'RecentGamesCard',
  description:
    'Recent games on the profile: the three latest games (any kind, newest first), each the standard game row with “session · date · club” under it; All games (N) opens the Games page.',
  usage: [
    'Display official records without result editing controls.',
    'Sits under Recent sessions (ProfileSessionsCard). Empty: “No games recorded yet.”',
    'me draws the profile owner first on every court; onOpenPlayer opens a face’s profile card; onShareGame only on your own profile.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Profile › Recent games (recentGamesCard, .rg-item, .rg-src)',
  },
  docs: [
    'docs/mockup-changes/2026-11-13-player-recent-sessions-games.md',
    'docs/screens/product/modules/player-information/ranking-history.md',
  ],
} satisfies ComponentMeta
