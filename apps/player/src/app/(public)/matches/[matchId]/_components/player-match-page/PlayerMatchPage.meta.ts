import type { ComponentMeta } from '@rotra/ui/meta'
export const playerMatchPageMeta = {
  name: 'PlayerMatchPage',
  description:
    'Container for the public match page: wires useMatchPage, the profile card, Share game and the back target to MatchPage.',
  usage: [
    'Only on `/matches/[matchId]`. Anyone can open it, signed out too; the read masks names for the viewer.',
  ],
  prototype: { file: 'apps/mockup/player-app/rotra-player.html', screen: 'Match page (viewMatch)' },
  docs: ['docs/screens/product/modules/player-information/match-page.md'],
  related: ['MatchPage', 'GamePlayerProfile', 'PlayerShare', 'MatchLink'],
} satisfies ComponentMeta
