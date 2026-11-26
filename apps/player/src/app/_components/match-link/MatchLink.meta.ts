import type { ComponentMeta } from '@rotra/ui/meta'
export const matchLinkMeta = {
  name: 'MatchLink',
  description:
    'Opens a game’s match page (`/matches/[matchId]`) from a game court and remembers the page it was tapped on for the match page’s back button.',
  usage: [
    '`useOpenMatch(label)` on every Player page with game courts (profile, Games, Sessions): pass the result as `onOpenGame`. The label is the back button text (the player’s name, Games, Sessions).',
    'On the match page use `openMatchFromMatch` so the back button keeps the first page; `readMatchFrom` / `clearMatchFrom` read and drop it. No entry reads Leaderboard.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'openMatch / matchBack' },
  docs: ['docs/screens/product/modules/player-information/match-page.md'],
} satisfies ComponentMeta
