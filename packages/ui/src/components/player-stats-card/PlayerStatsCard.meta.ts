import type { ComponentMeta } from '@rotra/ui/meta'

export const playerStatsCardMeta = {
  name: 'PlayerStatsCard',
  description:
    'A picked player’s record and earlier games of the same session, with their counted-game win rate this year.',
  usage: [
    'Render one card per picked player on the Game page. Pass the viewer’s id to label their own card and games “You”.',
    'Pass the stats and faces as the viewer may see them. Missing figures read as a dash.',
    'Profile opens the same profile card as a court face. Close returns focus to the player row in the VS card through the caller.',
    'Earlier courts show each game from this player’s side. Pass onOpenGame to open that game’s match page and onShareGame only for the viewer’s own games.',
  ],
  prototype: {
    file: 'apps/mockup/player-app/rotra-player.html',
    screen: 'Game page (viewMatch, statCard)',
  },
  docs: [
    'docs/screens/product/modules/player-information/match-page.md',
    'docs/mockup-changes/2026-11-26-player-match-court-vs-card.md',
  ],
  related: ['MatchPage', 'VsCard', 'ProfileBannerCard', 'GameRow'],
} satisfies ComponentMeta
